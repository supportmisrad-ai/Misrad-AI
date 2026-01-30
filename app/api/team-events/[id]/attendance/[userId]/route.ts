/**
 * Update Attendance Status API
 * 
 * For organizers to mark attendance (attended/absent) after event
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth';
import { createClient } from '../../../../../../lib/supabase';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

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
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
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

        const { id: eventId, userId } = await params;

        if (!eventId || !userId) {
            return apiError('Event ID and User ID are required', { status: 400 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserByEmailAndWorkspace({ supabase: supabaseClient, email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Get event to check if user is organizer
        const eventRes = await loadTeamEventInWorkspace({ supabaseClient, eventId, workspaceId: workspace.id });
        const event = (eventRes as any).data;
        const eventError = (eventRes as any).error;

        if (eventError || !event) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        // Check permissions: only organizer or admin can update attendance
        const isOrganizer = event.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);

        if (!isOrganizer && !isAdmin) {
            return apiError('רק מארגן האירוע יכול לעדכן נוכחות', { status: 403 });
        }

        const body = await request.json();
        const { status, notes } = body;

        if (!status || !['attended', 'absent'].includes(status)) {
            return apiError('סטטוס לא תקין. צריך להיות attended או absent', { status: 400 });
        }

        // Update attendance record
        const updateData: any = {
            status,
            attended_at: status === 'attended' ? new Date().toISOString() : null
        };

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        const { data: attendance, error } = await supabaseClient
            .from('nexus_event_attendance')
            .update(updateData)
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .eq('organization_id', workspace.id)
            .select()
            .single();

        if (error) {
            // If record doesn't exist, create it
            if (error.code === 'PGRST116') {
                const { data: newAttendance, error: createError } = await supabaseClient
                    .from('nexus_event_attendance')
                    .insert({
                        organization_id: workspace.id,
                        event_id: eventId,
                        user_id: userId,
                        status,
                        attended_at: status === 'attended' ? new Date().toISOString() : null,
                        notes: notes || null
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('[API] Error creating attendance:', createError);
                    return apiError('שגיאה בעדכון נוכחות', { status: 500 });
                }

                return apiSuccess({ attendance: newAttendance, message: 'נוכחות עודכנה בהצלחה' }, { status: 200 });
            }

            console.error('[API] Error updating attendance:', error);
            return apiError('שגיאה בעדכון נוכחות', { status: 500 });
        }

        return apiSuccess({ attendance, message: 'נוכחות עודכנה בהצלחה' }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/team-events/[id]/attendance/[userId] PATCH:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, {
            status: error.message?.includes('Unauthorized') ? 401 : 500,
            message: error.message || 'שגיאה בעדכון נוכחות',
        });
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
