import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Team Event by ID API
 * 
 * Handles update and delete operations for specific team events
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { TeamEvent, TeamEventStatus, TeamEventType } from '@/types';
import prisma from '@/lib/prisma';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { assertNoProdEntitlementsBypass, isBypassModuleEntitlementsEnabled, isE2eTestingEnv } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

function hasFunction(value: unknown, name: string): value is Record<string, (...args: unknown[]) => unknown> {
    const obj = asObject(value);
    const fn = obj?.[name];
    return typeof fn === 'function';
}

type NexusTeamEventsDelegate = {
    findFirst: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
};

function isNexusTeamEventsDelegate(value: unknown): value is NexusTeamEventsDelegate {
    return (
        asObject(value) !== null &&
        hasFunction(value, 'findFirst') &&
        hasFunction(value, 'updateMany') &&
        hasFunction(value, 'deleteMany')
    );
}

function getNexusTeamEventsDelegate(): NexusTeamEventsDelegate {
    const obj = asObject(prisma as unknown);
    const delegate = obj?.['nexus_team_events'];
    if (!isNexusTeamEventsDelegate(delegate)) {
        throw new Error('Prisma delegate nexus_team_events is unavailable');
    }
    return delegate;
}

function getString(obj: Record<string, unknown> | null, key: string, fallback = ''): string {
    const v = obj?.[key];
    return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

function toIsoOrEmpty(value: unknown): string {
    const s = String(value ?? '').trim();
    if (!s) return '';
    try {
        const d = new Date(s);
        if (Number.isFinite(d.getTime())) return d.toISOString();
    } catch {
        // ignore
    }
    return s;
}

function mapNexusUserRow(row: unknown) {
    const obj = asObject(row);
    return {
        id: obj ? getString(obj, 'id') : '',
        name: obj ? getString(obj, 'name', getString(obj, 'full_name', getString(obj, 'email'))) : '',
        role: obj ? getString(obj, 'role', 'עובד') : 'עובד',
        isSuperAdmin: Boolean(obj?.['is_super_admin'] ?? obj?.['isSuperAdmin'] ?? false),
        tenantId: (obj?.['organization_id'] ?? obj?.['organizationId']) ?? undefined,
    };
}

const TEAM_EVENT_TYPES: readonly TeamEventType[] = ['training', 'fun_day', 'group_meeting', 'enrichment', 'company_event', 'other'] as const;
const TEAM_EVENT_STATUSES: readonly TeamEventStatus[] = ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const;

function normalizeTeamEventType(input: unknown): TeamEventType {
    const v = String(input ?? '').trim();
    return (TEAM_EVENT_TYPES as readonly string[]).includes(v) ? (v as TeamEventType) : 'other';
}

function normalizeTeamEventStatus(input: unknown): TeamEventStatus {
    const v = String(input ?? '').trim();
    return (TEAM_EVENT_STATUSES as readonly string[]).includes(v) ? (v as TeamEventStatus) : 'scheduled';
}

function mapTeamEventRow(row: unknown): TeamEvent {
    const obj = asObject(row) ?? {};
    return {
        id: String(obj.id ?? ''),
        tenantId: obj.tenant_id ? String(obj.tenant_id) : undefined,
        title: String(obj.title ?? ''),
        description: obj.description == null ? undefined : String(obj.description),
        eventType: normalizeTeamEventType(obj.event_type),
        startDate: obj.start_date ? new Date(String(obj.start_date)).toISOString() : '',
        endDate: obj.end_date ? new Date(String(obj.end_date)).toISOString() : '',
        allDay: Boolean(obj.all_day ?? false),
        location: obj.location == null ? undefined : String(obj.location),
        organizerId: obj.organizer_id ? String(obj.organizer_id) : undefined,
        requiredAttendees: Array.isArray(obj.required_attendees) ? obj.required_attendees.map((x) => String(x)).filter(Boolean) : [],
        optionalAttendees: Array.isArray(obj.optional_attendees) ? obj.optional_attendees.map((x) => String(x)).filter(Boolean) : [],
        status: normalizeTeamEventStatus(obj.status),
        requiresApproval: Boolean(obj.requires_approval ?? false),
        approvedBy: obj.approved_by ? String(obj.approved_by) : undefined,
        approvedAt: obj.approved_at ? toIsoOrEmpty(obj.approved_at) : undefined,
        notificationSent: Boolean(obj.notification_sent ?? false),
        reminderSent: Boolean(obj.reminder_sent ?? false),
        reminderDaysBefore: typeof obj.reminder_days_before === 'number' ? obj.reminder_days_before : Number(obj.reminder_days_before ?? 1) || 1,
        metadata: asObject(obj.metadata) ?? {},
        createdAt: obj.created_at ? toIsoOrEmpty(obj.created_at) : '',
        createdBy: obj.created_by ? String(obj.created_by) : undefined,
        updatedAt: obj.updated_at ? toIsoOrEmpty(obj.updated_at) : '',
    };
}

async function selectUserByEmailAndWorkspace(params: { email: string; workspaceId: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: { organizationId: params.workspaceId, email },
    });
    if (!row?.id) return null;
    return mapNexusUserRow(row);
}

async function loadTeamEventInWorkspace(params: { eventId: string; workspaceId: string }) {
    return getNexusTeamEventsDelegate().findFirst({
        where: { id: String(params.eventId), organizationId: String(params.workspaceId) },
    });
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/team-events/[id]');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        const { id } = params;

        if (!id) {
            return apiError('Event ID is required', { status: 400 });
        }

        // Get existing event (must belong to workspace)
        const existingEvent = await loadTeamEventInWorkspace({ eventId: id, workspaceId: workspace.id });
        if (!existingEvent) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        const existingObj = asObject(existingEvent) ?? {};

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }
        const dbUser = await selectUserByEmailAndWorkspace({ email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Check permissions: organizer or admin
        const isOrganizer = String(existingObj.organizer_id || '') === String(dbUser.id);
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);

        if (!isOrganizer && !isAdmin) {
            return apiError('אין הרשאה לעדכן אירוע זה', { status: 403 });
        }

        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};
        const updateData: Record<string, unknown> = {};

        // Allowed fields to update
        if (bodyObj.title !== undefined) updateData.title = bodyObj.title;
        if (bodyObj.description !== undefined) updateData.description = bodyObj.description;
        if (bodyObj.eventType !== undefined) updateData.event_type = bodyObj.eventType;
        if (bodyObj.startDate !== undefined) {
            const d = new Date(String(bodyObj.startDate));
            if (Number.isFinite(d.getTime())) updateData.start_date = d;
        }
        if (bodyObj.endDate !== undefined) {
            const d = new Date(String(bodyObj.endDate));
            if (Number.isFinite(d.getTime())) updateData.end_date = d;
        }
        if (bodyObj.allDay !== undefined) updateData.all_day = bodyObj.allDay;
        if (bodyObj.location !== undefined) updateData.location = bodyObj.location;
        if (bodyObj.requiredAttendees !== undefined) updateData.required_attendees = bodyObj.requiredAttendees;
        if (bodyObj.optionalAttendees !== undefined) updateData.optional_attendees = bodyObj.optionalAttendees;
        if (bodyObj.status !== undefined) updateData.status = bodyObj.status;
        if (bodyObj.metadata !== undefined) updateData.metadata = bodyObj.metadata;
        if (bodyObj.requiresApproval !== undefined) updateData.requires_approval = Boolean(bodyObj.requiresApproval);

        // Approval handling (only admins/managers)
        if (isAdmin) {
            if (bodyObj.approved !== undefined) {
                if (Boolean(bodyObj.approved)) {
                    updateData.approved_by = dbUser.id;
                    updateData.approved_at = new Date();
                    if (String(existingObj.status || '') === 'draft') {
                        updateData.status = 'scheduled';
                    }
                } else {
                    updateData.approved_by = null;
                    updateData.approved_at = null;
                }
            }
            if (bodyObj.approvedBy !== undefined) {
                const approvedBy = String(bodyObj.approvedBy || '').trim();
                if (approvedBy) {
                    updateData.approved_by = approvedBy;
                    updateData.approved_at = new Date();
                    updateData.requires_approval = false;
                }
            }
        }

        updateData.updated_at = new Date();

        const res = await getNexusTeamEventsDelegate().updateMany({
            where: { id: String(id), organizationId: String(workspace.id) },
            data: updateData,
        });
        if (!res || typeof res.count !== 'number' || res.count < 1) {
            return apiError('שגיאה בעדכון אירוע', { status: 500 });
        }

        const updatedRow = await loadTeamEventInWorkspace({ eventId: id, workspaceId: workspace.id });
        return apiSuccess({ event: updatedRow ? mapTeamEventRow(updatedRow) : null, message: 'אירוע עודכן בהצלחה' }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/team-events/[id] PATCH');
        else console.error('[API] Error in /api/team-events/[id] PATCH:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                      ? 'Unauthorized'
                      : error.status === 404
                        ? 'Not found'
                        : error.status === 500
                          ? 'Internal server error'
                          : 'Forbidden';
            return apiError(error, {
                status: error.status,
                message: IS_PROD ? safeMsg : error.message || safeMsg,
            });
        }
        const msg = getErrorMessage(error);
        const safeMsg = 'שגיאה בעדכון אירוע';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: safeMsg,
        });
    }
}

async function DELETEHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/team-events/[id]#delete');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        const { id } = params;

        if (!id) {
            return apiError('Event ID is required', { status: 400 });
        }

        // Get existing event (must belong to workspace)
        const existingEvent = await loadTeamEventInWorkspace({ eventId: id, workspaceId: workspace.id });
        if (!existingEvent) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }
        const dbUser = await selectUserByEmailAndWorkspace({ email: user.email, workspaceId: workspace.id });

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
        const del = await getNexusTeamEventsDelegate().deleteMany({
            where: { id: String(id), organizationId: String(workspace.id) },
        });

        if (!del || typeof del.count !== 'number' || del.count < 1) {
            return apiError('שגיאה במחיקת אירוע', { status: 500 });
        }

        return apiSuccess({ message: 'אירוע נמחק בהצלחה' }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/team-events/[id] DELETE');
        else console.error('[API] Error in /api/team-events/[id] DELETE:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                      ? 'Unauthorized'
                      : error.status === 404
                        ? 'Not found'
                        : error.status === 500
                          ? 'Internal server error'
                          : 'Forbidden';
            return apiError(error, {
                status: error.status,
                message: IS_PROD ? safeMsg : error.message || safeMsg,
            });
        }
        const msg = getErrorMessage(error);
        const safeMsg = 'שגיאה במחיקת אירוע';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: safeMsg,
        });
    }
}

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
