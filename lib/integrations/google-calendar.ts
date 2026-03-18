/**
 * Google Calendar Integration
 * 
 * Handles synchronization between Nexus tasks and Google Calendar events
 * 
 * Note: This file does NOT use 'use server' because these are utility functions
 * used by API routes, not Server Actions.
 */

import { calendar_v3, google } from 'googleapis';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { refreshAccessToken } from './google-oauth';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

/**
 * Get authenticated Google Calendar client
 * 
 * @param userId - User ID
 * @param tenantId - Optional tenant ID
 * @returns Calendar client or null if not connected
 */
export async function getCalendarClient(
    userId: string,
    tenantId?: string
): Promise<calendar_v3.Calendar | null> {
    const userIdSafe = String(userId || '').trim();
    const tenantIdSafe = String(tenantId || '').trim();
    if (!tenantIdSafe || !userIdSafe) {
        console.error('[Calendar] Missing tenantId or userId (Tenant Isolation lockdown)');
        return null;
    }

    // Find integration
    const integration = await prisma.misradIntegration.findFirst({
        where: {
            user_id: userIdSafe,
            tenant_id: tenantIdSafe,
            service_type: 'google_calendar',
            is_active: true,
        },
    });

    if (!integration) {
        console.warn('[Calendar] Integration not found for user:', userId);
        return null;
    }

    // Check if token is expired and refresh if needed
    let accessToken = integration.access_token;
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;

    if (expiresAt && expiresAt < new Date() && integration.refresh_token) {
        try {
            const refreshed = await refreshAccessToken(integration.refresh_token);
            accessToken = refreshed.accessToken;

            // Update database with new token
            await prisma.misradIntegration.update({
                where: { id: String(integration.id) },
                data: {
                    access_token: refreshed.accessToken,
                    expires_at: refreshed.expiresAt,
                    refresh_token: refreshed.refreshToken || integration.refresh_token,
                    updated_at: new Date(),
                },
            });
        } catch (error) {
            console.error('[Calendar] Failed to refresh token:', error);
            return null;
        }
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: integration.refresh_token
    });

    // Create Calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    return calendar;
}

/**
 * Sync task to Google Calendar (create or update event)
 * 
 * @param task - Task to sync
 * @param userId - User ID
 * @param tenantId - Optional tenant ID
 * @returns Google Calendar event ID
 */
export async function syncTaskToCalendar(
    task: unknown,
    userId: string,
    tenantId?: string
): Promise<string | null> {
    const taskObj = asObject(task) ?? {};
    const dueDateValue = taskObj.dueDate ?? taskObj.due_date;
    if (!dueDateValue) {
        return null; // No date to sync
    }

    const calendar = await getCalendarClient(userId, tenantId);
    if (!calendar) {
        return null;
    }

    try {
        // Parse due date
        const dueDate =
            dueDateValue instanceof Date
                ? dueDateValue
                : typeof dueDateValue === 'string' || typeof dueDateValue === 'number'
                    ? new Date(dueDateValue)
                    : null;
        if (!dueDate || isNaN(dueDate.getTime())) {
            return null;
        }

        // Check if event already exists (stored in task metadata)
        const existingEventId = typeof taskObj.googleCalendarEventId === 'string' ? taskObj.googleCalendarEventId : null;
        const taskId = typeof taskObj.id === 'string' ? taskObj.id : taskObj.id == null ? '' : String(taskObj.id);
        const taskTitle = typeof taskObj.title === 'string' ? taskObj.title : taskObj.title == null ? '' : String(taskObj.title);
        const taskDescription =
            typeof taskObj.description === 'string' ? taskObj.description : taskObj.description == null ? '' : String(taskObj.description);

        const eventData: calendar_v3.Schema$Event = {
            summary: String(taskTitle || ''),
            description: String(taskDescription || ''),
            start: {
                dateTime: dueDate.toISOString(),
                timeZone: 'Asia/Jerusalem'
            },
            end: {
                dateTime: new Date(dueDate.getTime() + 3600000).toISOString(), // 1 hour default
                timeZone: 'Asia/Jerusalem'
            },
            conferenceData: {
                createRequest: {
                    requestId: `meet-${taskId || Date.now()}-${Math.random().toString(36).substring(7)}`,
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet'
                    }
                }
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 day before
                    { method: 'popup', minutes: 60 } // 1 hour before
                ]
            }
        };

        let eventId: string;

        if (existingEventId) {
            // Update existing event
            const response = await calendar.events.update({
                calendarId: 'primary',
                eventId: existingEventId,
                conferenceDataVersion: 1,
                requestBody: eventData
            });
            eventId = response.data.id || existingEventId;
        } else {
            // Create new event with Google Meet link
            const response = await calendar.events.insert({
                calendarId: 'primary',
                conferenceDataVersion: 1,
                requestBody: eventData
            });
            eventId = response.data.id || '';
        }

        // Log sync
        if (tenantId) {
            const userIdSafe = String(userId || '').trim();
            const tenantIdSafe = String(tenantId || '').trim();
            const integrationRow = await prisma.misradIntegration.findFirst({
                where: {
                    user_id: userIdSafe,
                    tenant_id: tenantIdSafe,
                    service_type: 'google_calendar',
                    is_active: true,
                },
                select: { id: true },
            });

            await prisma.misradCalendarSyncLog.create({
                data: {
                    integration_id: integrationRow?.id ?? null,
                    event_id: eventId,
                    action: existingEventId ? 'updated' : 'created',
                    direction: 'to_google',
                    status: 'success',
                    metadata: { taskId: taskId || null, organizationId: tenantId } as Prisma.InputJsonValue,
                },
            });
        }

        return eventId;

    } catch (error: unknown) {
        console.error('[Calendar] Error syncing task to calendar:', getErrorMessage(error));
        return null;
    }
}

/**
 * Sync events from Google Calendar to tasks
 * 
 * @param userId - User ID
 * @param tenantId - Optional tenant ID
 * @param timeMin - Start time for events (default: now)
 * @param timeMax - End time for events (default: 30 days from now)
 * @returns Array of synced event IDs
 */
export async function syncCalendarToTasks(
    userId: string,
    tenantId?: string,
    timeMin?: Date,
    timeMax?: Date
): Promise<string[]> {
    const calendar = await getCalendarClient(userId, tenantId);
    if (!calendar) {
        return [];
    }

    try {
        const now = new Date();
        const min = timeMin || now;
        const max = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: min.toISOString(),
            timeMax: max.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 100
        });

        const events = response.data.items || [];
        const syncedIds: string[] = [];

        // TODO: Create tasks from events (if not already synced)
        // This would require checking if event already has corresponding task
        // and creating new tasks for events that don't

        // Update last sync time
        if (tenantId) {
            const userIdSafe = String(userId || '').trim();
            const tenantIdSafe = String(tenantId || '').trim();
            await prisma.misradIntegration.updateMany({
                where: {
                    user_id: userIdSafe,
                    tenant_id: tenantIdSafe,
                    service_type: 'google_calendar',
                    is_active: true,
                },
                data: {
                    last_synced_at: new Date(),
                    updated_at: new Date(),
                },
            });
        }

        return syncedIds;

    } catch (error: unknown) {
        console.error('[Calendar] Error syncing calendar to tasks:', getErrorMessage(error));
        return [];
    }
}

/**
 * Delete event from Google Calendar
 * 
 * @param eventId - Google Calendar event ID
 * @param userId - User ID
 * @param tenantId - Optional tenant ID
 */
export async function deleteCalendarEvent(
    eventId: string,
    userId: string,
    tenantId?: string
): Promise<boolean> {
    const calendar = await getCalendarClient(userId, tenantId);
    if (!calendar) {
        return false;
    }

    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId
        });

        return true;
    } catch (error: unknown) {
        console.error('[Calendar] Error deleting calendar event:', getErrorMessage(error));
        return false;
    }
}

