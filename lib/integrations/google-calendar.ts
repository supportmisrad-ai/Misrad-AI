/**
 * Google Calendar Integration
 * 
 * Handles synchronization between Nexus tasks and Google Calendar events
 * 
 * Note: This file does NOT use 'use server' because these are utility functions
 * used by API routes, not Server Actions.
 */

import { calendar_v3, google } from 'googleapis';
import { supabase } from '../supabase';
import { refreshAccessToken } from './google-oauth';
import { Task } from '../../types';

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
    if (!supabase) {
        console.error('[Calendar] Supabase not configured');
        return null;
    }

    // Find integration
    let query = (supabase as any)
        .from('misrad_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('service_type', 'google_calendar')
        .eq('is_active', true)
        .single();

    if (tenantId) {
        query = query.eq('tenant_id', tenantId);
    }

    const { data: integration, error } = await query;

    if (error || !integration) {
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
            await (supabase as any)
                .from('misrad_integrations')
                .update({
                    access_token: refreshed.accessToken,
                    expires_at: refreshed.expiresAt.toISOString(),
                    refresh_token: refreshed.refreshToken || integration.refresh_token,
                    updated_at: new Date().toISOString()
                })
                .eq('id', integration.id);
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
    task: Task,
    userId: string,
    tenantId?: string
): Promise<string | null> {
    if (!task.dueDate) {
        return null; // No date to sync
    }

    const calendar = await getCalendarClient(userId, tenantId);
    if (!calendar) {
        return null;
    }

    try {
        // Parse due date
        const dueDate = new Date(task.dueDate);
        if (isNaN(dueDate.getTime())) {
            return null;
        }

        // Check if event already exists (stored in task metadata)
        const existingEventId = (task as any).googleCalendarEventId;

        const eventData: calendar_v3.Schema$Event = {
            summary: task.title,
            description: task.description || '',
            start: {
                dateTime: dueDate.toISOString(),
                timeZone: 'Asia/Jerusalem'
            },
            end: {
                dateTime: new Date(dueDate.getTime() + 3600000).toISOString(), // 1 hour default
                timeZone: 'Asia/Jerusalem'
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
                requestBody: eventData
            });
            eventId = response.data.id || existingEventId;
        } else {
            // Create new event
            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: eventData
            });
            eventId = response.data.id || '';
        }

        // Log sync
        if (supabase) {
            await (supabase as any).from('misrad_calendar_sync_log').insert({
                integration_id: (await (supabase as any).from('misrad_integrations').select('id').eq('user_id', userId).eq('service_type', 'google_calendar').single()).data?.id,
                event_id: eventId,
                action: existingEventId ? 'updated' : 'created',
                direction: 'to_google',
                status: 'success',
                metadata: { taskId: task.id }
            });
        }

        return eventId;

    } catch (error: any) {
        console.error('[Calendar] Error syncing task to calendar:', error);
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
        if (supabase) {
            await (supabase as any)
                .from('misrad_integrations')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('user_id', userId)
                .eq('service_type', 'google_calendar')
                .eq('is_active', true);
        }

        return syncedIds;

    } catch (error: any) {
        console.error('[Calendar] Error syncing calendar to tasks:', error);
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
    } catch (error: any) {
        console.error('[Calendar] Error deleting calendar event:', error);
        return false;
    }
}

