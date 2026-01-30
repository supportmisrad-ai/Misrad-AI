/**
 * Team Event by ID API
 * 
 * Handles update and delete operations for specific team events
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createClient } from '../../../../lib/supabase';
import { TeamEvent } from '../../../../types';
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

        const { id } = await params;

        if (!id) {
            return apiError('Event ID is required', { status: 400 });
        }

        // Get existing event (must belong to workspace)
        const existingRes = await loadTeamEventInWorkspace({ supabaseClient, eventId: id, workspaceId: workspace.id });
        const existingEvent = (existingRes as any).data;
        const getError = (existingRes as any).error;

        if (getError || !existingEvent) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }
        const dbUser = await selectUserByEmailAndWorkspace({ supabase: supabaseClient, email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Check permissions: organizer or admin
        const isOrganizer = existingEvent.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);

        if (!isOrganizer && !isAdmin) {
            return apiError('אין הרשאה לעדכן אירוע זה', { status: 403 });
        }

        const body = await request.json();
        const updateData: any = {};

        // Allowed fields to update
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.eventType !== undefined) updateData.event_type = body.eventType;
        if (body.startDate !== undefined) updateData.start_date = body.startDate;
        if (body.endDate !== undefined) updateData.end_date = body.endDate;
        if (body.allDay !== undefined) updateData.all_day = body.allDay;
        if (body.location !== undefined) updateData.location = body.location;
        if (body.requiredAttendees !== undefined) updateData.required_attendees = body.requiredAttendees;
        if (body.optionalAttendees !== undefined) updateData.optional_attendees = body.optionalAttendees;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.metadata !== undefined) updateData.metadata = body.metadata;

        // Approval handling (only admins/managers)
        if (isAdmin) {
            if (body.approved !== undefined) {
                if (body.approved) {
                    updateData.approved_by = dbUser.id;
                    updateData.approved_at = new Date().toISOString();
                    if (existingEvent.status === 'draft') {
                        updateData.status = 'scheduled';
                    }
                } else {
                    updateData.approved_by = null;
                    updateData.approved_at = null;
                }
            }
        }

        const { data: updatedEvent, error } = await supabaseClient
            .from('nexus_team_events')
            .update(updateData)
            .eq('id', id)
            .eq('organization_id', workspace.id)
            .select()
            .single();

        if ((error as any)?.code === '42703') {
            return apiError('[SchemaMismatch] nexus_team_events is missing organization_id', { status: 500 });
        }

        if (error) {
            console.error('[API] Error updating team event:', error);
            return apiError('שגיאה בעדכון אירוע', { status: 500 });
        }

        return apiSuccess({ event: updatedEvent, message: 'אירוע עודכן בהצלחה' }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/team-events/[id] PATCH:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, {
            status: error.message?.includes('Unauthorized') ? 401 : 500,
            message: error.message || 'שגיאה בעדכון אירוע',
        });
    }
}

async function DELETEHandler(
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

        const { id } = await params;

        if (!id) {
            return apiError('Event ID is required', { status: 400 });
        }

        // Get existing event (must belong to workspace)
        const existingRes = await loadTeamEventInWorkspace({ supabaseClient, eventId: id, workspaceId: workspace.id });
        const existingEvent = (existingRes as any).data;
        const getError = (existingRes as any).error;

        if (getError || !existingEvent) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }
        const dbUser = await selectUserByEmailAndWorkspace({ supabase: supabaseClient, email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Check permissions: organizer or admin
        const isOrganizer = existingEvent.organizer_id === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);

        if (!isOrganizer && !isAdmin) {
            return apiError('אין הרשאה למחוק אירוע זה', { status: 403 });
        }

        // Delete event (cascade will delete attendance records)
        const byTenantDelete = await supabaseClient
            .from('nexus_team_events')
            .delete()
            .eq('id', id)
            .eq('organization_id', workspace.id);

        const deleteError = (byTenantDelete as any)?.error;
        if (deleteError?.code === '42703') {
            return apiError('[SchemaMismatch] nexus_team_events is missing organization_id', { status: 500 });
        }

        if (deleteError) {
            console.error('[API] Error deleting team event:', deleteError);
            return apiError('שגיאה במחיקת אירוע', { status: 500 });
        }

        return apiSuccess({ message: 'אירוע נמחק בהצלחה' }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error in /api/team-events/[id] DELETE:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, {
            status: error.message?.includes('Unauthorized') ? 401 : 500,
            message: error.message || 'שגיאה במחיקת אירוע',
        });
    }
}

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
