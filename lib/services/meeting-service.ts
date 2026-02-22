/**
 * Meeting Service - Unified interface for Zoom and Google Meet
 * 
 * Automatically creates meeting links based on user preference and availability
 */

import { createZoomMeeting, isZoomConnected } from '@/lib/integrations/zoom';
import { syncTaskToCalendar, getCalendarClient } from '@/lib/integrations/google-calendar';
import prisma from '@/lib/prisma';

export type MeetingPlatform = 'zoom' | 'meet' | 'none';

export interface CreateMeetingOptions {
  userId: string;
  organizationId: string;
  title: string;
  startTime: Date;
  duration: number; // in minutes
  description?: string;
  preferredPlatform?: MeetingPlatform;
}

export interface MeetingResult {
  platform: MeetingPlatform;
  joinUrl?: string;
  startUrl?: string;
  password?: string;
  eventId?: string;
  calendarEventId?: string;
}

/**
 * Determine which platform to use based on user preferences and connectivity
 */
async function determinePlatform(
  userId: string,
  organizationId: string,
  preferred?: MeetingPlatform
): Promise<MeetingPlatform> {
  // If user explicitly requested none
  if (preferred === 'none') {
    return 'none';
  }

  // Check connectivity
  const [hasZoom, hasMeet] = await Promise.all([
    isZoomConnected(userId, organizationId),
    getCalendarClient(userId, organizationId).then(client => !!client),
  ]);

  // If user has preference and it's available
  if (preferred === 'zoom' && hasZoom) return 'zoom';
  if (preferred === 'meet' && hasMeet) return 'meet';

  // Auto-select based on what's available
  if (hasZoom) return 'zoom';
  if (hasMeet) return 'meet';

  return 'none';
}

/**
 * Create a meeting with automatic platform selection
 */
export async function createMeeting(
  options: CreateMeetingOptions
): Promise<MeetingResult> {
  const platform = await determinePlatform(
    options.userId,
    options.organizationId,
    options.preferredPlatform
  );

  const result: MeetingResult = { platform };

  try {
    switch (platform) {
      case 'zoom': {
        const meeting = await createZoomMeeting(
          options.userId,
          options.organizationId,
          {
            topic: options.title,
            start_time: options.startTime.toISOString(),
            duration: options.duration,
            agenda: options.description,
          }
        );

        if (meeting) {
          result.joinUrl = meeting.join_url;
          result.startUrl = meeting.start_url;
          result.password = meeting.password;
          result.eventId = meeting.id.toString();
        }
        break;
      }

      case 'meet': {
        // Google Meet is created via Calendar API
        const calendar = await getCalendarClient(options.userId, options.organizationId);
        
        if (calendar) {
          const eventData = {
            summary: options.title,
            description: options.description || '',
            start: {
              dateTime: options.startTime.toISOString(),
              timeZone: 'Asia/Jerusalem',
            },
            end: {
              dateTime: new Date(options.startTime.getTime() + options.duration * 60000).toISOString(),
              timeZone: 'Asia/Jerusalem',
            },
            conferenceData: {
              createRequest: {
                requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                conferenceSolutionKey: {
                  type: 'hangoutsMeet',
                },
              },
            },
          };

          const response = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: eventData,
          });

          if (response.data) {
            result.calendarEventId = response.data.id || undefined;
            result.joinUrl = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || undefined;
          }
        }
        break;
      }

      case 'none':
        // No online meeting platform
        break;
    }

    return result;
  } catch (error) {
    console.error('[Meeting Service] Error creating meeting:', error);
    throw error;
  }
}

/**
 * Get user's connected platforms
 */
export async function getConnectedPlatforms(
  userId: string,
  organizationId: string
): Promise<{
  zoom: boolean;
  meet: boolean;
}> {
  const [hasZoom, hasMeet] = await Promise.all([
    isZoomConnected(userId, organizationId).catch(() => false),
    getCalendarClient(userId, organizationId).then(client => !!client).catch(() => false),
  ]);

  return {
    zoom: hasZoom,
    meet: hasMeet,
  };
}

/**
 * Get recommended platform for user
 */
export async function getRecommendedPlatform(
  userId: string,
  organizationId: string
): Promise<MeetingPlatform> {
  const connected = await getConnectedPlatforms(userId, organizationId);
  
  // Prefer Zoom if available (generally better for business)
  if (connected.zoom) return 'zoom';
  if (connected.meet) return 'meet';
  
  return 'none';
}
