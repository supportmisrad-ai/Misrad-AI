/**
 * Event Attendance API
 * 
 * Handles RSVP and attendance tracking for team events
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { createClient } from '../../../../../lib/supabase';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

function mapNexusUserRow(row: any) {
    return {
        id: String(row?.id ?? ''),
        name: String(row?.name ?? row?.full_name ?? row?.email ?? ''),
        role: String(row?.role ?? 'עובד'),
        isSuperAdmin: Boolean(row?.is_super_admin ?? false),
        tenantId: row?.organization_id ?? undefined,
    };
}

async function selectUserByEmailAndWorkspace(params: { supabase: any; email: string; workspaceId: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('*')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    if (byOrg.error || !byOrg.data) return null;
    return mapNexusUserRow(byOrg.data);
}

async function selectUsersByIdsInWorkspace(params: { supabase: any; workspaceId: string; userIds: string[] }) {
    const ids = Array.from(new Set((params.userIds || []).filter(Boolean)));
    if (ids.length === 0) return [] as any[];

    const out: any[] = [];
    const chunkSize = 500;
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const byOrg = await params.supabase
            .from('nexus_users')
            .select('id, name, full_name, email, organization_id')
            .in('id', chunk)
            .eq('organization_id', params.workspaceId);

        if ((byOrg as any)?.error?.code === '42703') {
            throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
        }

        const rows = Array.isArray(byOrg.data) ? byOrg.data : [];
        out.push(...rows.map(mapNexusUserRow));
    }

    return out;
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

        const supabaseClient = createClient();

        const { workspace } = await getWorkspaceOrThrow(request);

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        const { id: eventId } = await params;

        if (!eventId) {
            return apiError('Event ID is required', { status: 400 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserByEmailAndWorkspace({ supabase: supabaseClient, email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Get event to check permissions
        const eventRes = await loadTeamEventInWorkspace({ supabaseClient, eventId, workspaceId: workspace.id });
        const event = (eventRes as any).data;
        const eventError = (eventRes as any).error;

        if (eventError || !event) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        // Check if user can view attendance (organizer, admin, or invited user)
        const isOrganizer = event.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);
        const isInvited = 
            (event.required_attendees && event.required_attendees.includes(dbUser.id)) ||
            (event.optional_attendees && event.optional_attendees.includes(dbUser.id));

        if (!isOrganizer && !isAdmin && !isInvited) {
            return apiError('אין הרשאה לצפות בנוכחות', { status: 403 });
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
            return apiError('שגיאה בטעינת נוכחות', { status: 500 });
        }

        // Enrich with user names (batch)
        const attendeeIds = (attendance || []).map((att: any) => String(att?.user_id ?? '')).filter(Boolean);
        const attendees = await selectUsersByIdsInWorkspace({ supabase: supabaseClient, workspaceId: workspace.id, userIds: attendeeIds });
        const nameById = new Map(attendees.map((u: any) => [String(u.id), String(u.name || 'משתמש לא ידוע')]));

        const enrichedAttendance = (attendance || []).map((att: any) => ({
            ...att,
            userId: att.user_id,
            userName: nameById.get(String(att.user_id)) || 'משתמש לא ידוע',
        }));

        return apiSuccess({ attendance: enrichedAttendance }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/team-events/[id]/attendance GET:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, {
            status: error.message?.includes('Unauthorized') ? 401 : 500,
            message: error.message || 'שגיאה בטעינת נוכחות',
        });
    }
}

async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        const supabaseClient = createClient();

        const { workspace } = await getWorkspaceOrThrow(request);

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        const { id: eventId } = await params;

        if (!eventId) {
            return apiError('Event ID is required', { status: 400 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserByEmailAndWorkspace({ supabase: supabaseClient, email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Get event (must belong to workspace)
        const eventRes = await loadTeamEventInWorkspace({ supabaseClient, eventId, workspaceId: workspace.id });
        const event = (eventRes as any).data;
        const eventError = (eventRes as any).error;

        if (eventError || !event) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        const body = await request.json();
        const { status, notes } = body;

        if (!status || !['attending', 'not_attending'].includes(status)) {
            return apiError('סטטוס לא תקין. צריך להיות attending או not_attending', { status: 400 });
        }

        // Check if user is invited
        const isInvited = 
            (event.required_attendees && event.required_attendees.includes(dbUser.id)) ||
            (event.optional_attendees && event.optional_attendees.includes(dbUser.id));

        if (!isInvited) {
            return apiError('אתה לא מוזמן לאירוע זה', { status: 403 });
        }

        // Upsert attendance record
        const { data: attendance, error } = await supabaseClient
            .from('nexus_event_attendance')
            .upsert({
                organization_id: workspace.id,
                event_id: eventId,
                user_id: dbUser.id,
                status,
                rsvp_at: new Date().toISOString(),
                notes: notes || null
            }, {
                onConflict: 'event_id,user_id',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error creating/updating attendance:', error);
            return apiError('שגיאה בשמירת אישור הגעה', { status: 500 });
        }

        return apiSuccess({ attendance, message: 'אישור הגעה נשמר בהצלחה' }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/team-events/[id]/attendance POST:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, {
            status: error.message?.includes('Unauthorized') ? 401 : 500,
            message: error.message || 'שגיאה בשמירת אישור הגעה',
        });
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
