/**
 * Event Attendance API
 * 
 * Handles RSVP and attendance tracking for team events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { createClient } from '../../../../../lib/supabase';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function loadUserInWorkspaceByEmail(params: { supabase: any; workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id, role, is_super_admin')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data
        ? { id: byOrg.data.id, role: byOrg.data.role, isSuperAdmin: Boolean((byOrg.data as any).is_super_admin) }
        : null;
}

async function loadTeamEventInWorkspace(params: { supabaseClient: any; eventId: string; workspaceId: string }) {
    const res = await params.supabaseClient
        .from('nexus_team_events')
        .select('*')
        .eq('id', params.eventId)
        .eq('organization_id', params.workspaceId)
        .single();

    if ((res as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_team_events is missing organization_id');
    }

    return res;
}

async function GETHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        let supabaseClient: any;
        try {
            supabaseClient = createClient();
        } catch {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id: eventId } = await params;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            );
        }

        // Get user from database
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const dbUser = await loadUserInWorkspaceByEmail({ supabase: supabaseClient, workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event to check permissions
        const eventRes = await loadTeamEventInWorkspace({ supabaseClient, eventId, workspaceId: workspace.id });
        const event = (eventRes as any).data;
        const eventError = (eventRes as any).error;

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'אירוע לא נמצא' },
                { status: 404 }
            );
        }

        // Check if user can view attendance (organizer, admin, or invited user)
        const isOrganizer = event.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);
        const isInvited = 
            (event.required_attendees && event.required_attendees.includes(dbUser.id)) ||
            (event.optional_attendees && event.optional_attendees.includes(dbUser.id));

        if (!isOrganizer && !isAdmin && !isInvited) {
            return NextResponse.json(
                { error: 'אין הרשאה לצפות בנוכחות' },
                { status: 403 }
            );
        }

        // Get all attendance records for this event
        const { data: attendance, error } = await supabaseClient
            .from('nexus_event_attendance')
            .select('*')
            .eq('event_id', eventId)
            .eq('organization_id', workspace.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[API] Error fetching attendance:', error);
            return NextResponse.json(
                { error: 'שגיאה בטעינת נוכחות' },
                { status: 500 }
            );
        }

        return NextResponse.json({ attendance: attendance || [] }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/events/[id]/attendance GET:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת נוכחות' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        let supabaseClient: any;
        try {
            supabaseClient = createClient();
        } catch {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id: eventId } = await params;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            );
        }

        // Get user from database
        if (!user.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const dbUser = await loadUserInWorkspaceByEmail({ supabase: supabaseClient, workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // Get event
        const eventRes = await loadTeamEventInWorkspace({ supabaseClient, eventId, workspaceId: workspace.id });
        const event = (eventRes as any).data;
        const eventError = (eventRes as any).error;

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'אירוע לא נמצא' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { status, notes } = body;

        if (!status || !['attending', 'not_attending'].includes(status)) {
            return NextResponse.json(
                { error: 'סטטוס לא תקין. צריך להיות attending או not_attending' },
                { status: 400 }
            );
        }

        // Check if user is invited
        const isInvited = 
            (event.required_attendees && event.required_attendees.includes(dbUser.id)) ||
            (event.optional_attendees && event.optional_attendees.includes(dbUser.id));

        if (!isInvited) {
            return NextResponse.json(
                { error: 'אתה לא מוזמן לאירוע זה' },
                { status: 403 }
            );
        }

        // Upsert attendance record
        const nowIso = new Date().toISOString();
        const existingRes = await supabaseClient
            .from('nexus_event_attendance')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', dbUser.id)
            .eq('organization_id', workspace.id)
            .limit(1)
            .maybeSingle();

        if (existingRes.error) {
            console.error('[API] Error checking existing attendance:', existingRes.error);
            return NextResponse.json(
                { error: 'שגיאה בשמירת אישור הגעה' },
                { status: 500 }
            );
        }

        const { data: attendance, error } = existingRes.data
            ? await supabaseClient
                  .from('nexus_event_attendance')
                  .update({
                      status,
                      rsvp_at: nowIso,
                      notes: notes || null,
                  })
                  .eq('id', existingRes.data.id)
                  .eq('organization_id', workspace.id)
                  .select()
                  .single()
            : await supabaseClient
                  .from('nexus_event_attendance')
                  .insert({
                      organization_id: workspace.id,
                      event_id: eventId,
                      user_id: dbUser.id,
                      status,
                      rsvp_at: nowIso,
                      notes: notes || null
                  })
                  .select()
                  .single();

        if (error) {
            console.error('[API] Error creating/updating attendance:', error);
            return NextResponse.json(
                { error: 'שגיאה בשמירת אישור הגעה' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { attendance, message: 'אישור הגעה נשמר בהצלחה' },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[API] Error in /api/events/[id]/attendance POST:', error);
        if (error instanceof APIError) {
            return NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status });
        }
        return NextResponse.json(
            { error: error.message || 'שגיאה בשמירת אישור הגעה' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
