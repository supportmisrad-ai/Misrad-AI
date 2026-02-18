import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Event Attendance API
 * 
 * Handles RSVP and attendance tracking for team events
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
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
};

type NexusEventAttendanceDelegate = {
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>>;
    findFirst: (args: { where: Record<string, unknown>; select?: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
};

function isNexusTeamEventsDelegate(value: unknown): value is NexusTeamEventsDelegate {
    return asObject(value) !== null && hasFunction(value, 'findFirst');
}

function isNexusEventAttendanceDelegate(value: unknown): value is NexusEventAttendanceDelegate {
    return (
        asObject(value) !== null &&
        hasFunction(value, 'findMany') &&
        hasFunction(value, 'findFirst') &&
        hasFunction(value, 'updateMany') &&
        hasFunction(value, 'create')
    );
}

function getNexusTeamEventsDelegate(): NexusTeamEventsDelegate {
    const obj = asObject(prisma as unknown);
    const delegate = obj?.['nexusTeamEvent'];
    if (!isNexusTeamEventsDelegate(delegate)) {
        throw new Error('Prisma delegate nexusTeamEvent is unavailable');
    }
    return delegate;
}

function getNexusEventAttendanceDelegate(): NexusEventAttendanceDelegate {
    const obj = asObject(prisma as unknown);
    const delegate = obj?.['nexusEventAttendance'];
    if (!isNexusEventAttendanceDelegate(delegate)) {
        throw new Error('Prisma delegate nexusEventAttendance is unavailable');
    }
    return delegate;
}

function getString(obj: Record<string, unknown> | null, key: string, fallback = ''): string {
    const v = obj?.[key];
    return typeof v === 'string' ? v : v == null ? fallback : String(v);
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

async function selectUserByEmailAndWorkspace(params: { email: string; workspaceId: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: { organizationId: params.workspaceId, email },
    });
    if (!row?.id) return null;
    return mapNexusUserRow(row);
}

async function selectUsersByIdsInWorkspace(params: { workspaceId: string; userIds: string[] }) {
    const ids = Array.from(new Set((params.userIds || []).filter(Boolean)));
    if (ids.length === 0) return [];

    const rows = await prisma.nexusUser.findMany({
        where: { organizationId: params.workspaceId, id: { in: ids } },
        select: { id: true, name: true, email: true, role: true, isSuperAdmin: true, organizationId: true },
    });

    return (Array.isArray(rows) ? rows : []).map(mapNexusUserRow);
}

async function loadTeamEventInWorkspace(params: { eventId: string; workspaceId: string }) {
    return getNexusTeamEventsDelegate().findFirst({
        where: { id: String(params.eventId), organizationId: String(params.workspaceId) },
    });
}
async function GETHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/team-events/[id]/attendance');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        const { id: eventId } = params;

        if (!eventId) {
            return apiError('Event ID is required', { status: 400 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserByEmailAndWorkspace({ email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Get event to check permissions
        const event = await loadTeamEventInWorkspace({ eventId, workspaceId: workspace.id });
        if (!event) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        const eventObj = asObject(event) ?? {};
        const organizerId = String(eventObj.organizer_id ?? '');
        const requiredAttendees = Array.isArray(eventObj.required_attendees)
            ? (eventObj.required_attendees as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];
        const optionalAttendees = Array.isArray(eventObj.optional_attendees)
            ? (eventObj.optional_attendees as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];

        // Check if user can view attendance (organizer, admin, or invited user)
        const isOrganizer = organizerId === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);
        const isInvited = 
            requiredAttendees.includes(dbUser.id) ||
            optionalAttendees.includes(dbUser.id);

        if (!isOrganizer && !isAdmin && !isInvited) {
            return apiError('אין הרשאה לצפות בנוכחות', { status: 403 });
        }

        // Get all attendance records for this event
        const attendanceRows = await prisma.nexusEventAttendance.findMany({
            where: { event_id: String(eventId), organizationId: String(workspace.id) },
            orderBy: { created_at: 'asc' },
        });

        // Enrich with user names (batch)
        const attendeeIds = (attendanceRows || []).map((att) => String(att?.user_id ?? '')).filter(Boolean);
        const attendees = await selectUsersByIdsInWorkspace({ workspaceId: workspace.id, userIds: attendeeIds });
        const nameById = new Map(attendees.map((u) => [String(u.id), String(u.name || 'משתמש לא ידוע')]));

        const enrichedAttendance = (attendanceRows || []).map((att) => ({
            ...att,
            userId: att.user_id,
            userName: nameById.get(String(att.user_id)) || 'משתמש לא ידוע',
        }));

        return apiSuccess({ attendance: enrichedAttendance }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/team-events/[id]/attendance GET');
        else console.error('[API] Error in /api/team-events/[id]/attendance GET:', error);
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
        const safeMsg = 'שגיאה בטעינת נוכחות';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: IS_PROD ? safeMsg : msg || safeMsg,
        });
    }
}

async function POSTHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/team-events/[id]/attendance#post');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        const { id: eventId } = params;

        if (!eventId) {
            return apiError('Event ID is required', { status: 400 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserByEmailAndWorkspace({ email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Get event (must belong to workspace)
        const event = await loadTeamEventInWorkspace({ eventId, workspaceId: workspace.id });
        if (!event) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        const eventObj = asObject(event) ?? {};
        const requiredAttendees = Array.isArray(eventObj.required_attendees)
            ? (eventObj.required_attendees as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];
        const optionalAttendees = Array.isArray(eventObj.optional_attendees)
            ? (eventObj.optional_attendees as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];

        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};
        const statusRaw = bodyObj.status;
        const status = typeof statusRaw === 'string' ? statusRaw : String(statusRaw ?? '');
        const notesRaw = bodyObj.notes;
        const notes = notesRaw == null ? null : String(notesRaw);

        if (!status || !['attending', 'not_attending'].includes(status)) {
            return apiError('סטטוס לא תקין. צריך להיות attending או not_attending', { status: 400 });
        }

        // Check if user is invited
        const isInvited = requiredAttendees.includes(dbUser.id) || optionalAttendees.includes(dbUser.id);

        if (!isInvited) {
            return apiError('אתה לא מוזמן לאירוע זה', { status: 403 });
        }

        // Upsert attendance record
        const now = new Date();
        const delegate = getNexusEventAttendanceDelegate();

        const existing = await delegate.findFirst({
            where: {
                organizationId: String(workspace.id),
                event_id: String(eventId),
                user_id: String(dbUser.id),
            },
            select: { id: true },
        });

        if (existing?.id) {
            await delegate.updateMany({
                where: {
                    id: String(existing.id),
                    organizationId: String(workspace.id),
                },
                data: {
                    status: String(status),
                    rsvp_at: now,
                    notes: notes || null,
                    updated_at: now,
                },
            });
        } else {
            try {
                await delegate.create({
                    data: {
                        organizationId: String(workspace.id),
                        event_id: String(eventId),
                        user_id: String(dbUser.id),
                        status: String(status),
                        rsvp_at: now,
                        notes: notes || null,
                        created_at: now,
                        updated_at: now,
                    },
                });
            } catch (e: unknown) {
                const code = String(asObject(e)?.code || '');
                if (code !== 'P2002') {
                    throw e;
                }
                await delegate.updateMany({
                    where: {
                        organizationId: String(workspace.id),
                        event_id: String(eventId),
                        user_id: String(dbUser.id),
                    },
                    data: {
                        status: String(status),
                        rsvp_at: now,
                        notes: notes || null,
                        updated_at: now,
                    },
                });
            }
        }

        const row = await delegate.findFirst({
            where: {
                organizationId: String(workspace.id),
                event_id: String(eventId),
                user_id: String(dbUser.id),
            },
        });

        return apiSuccess({ attendance: row, message: 'אישור הגעה נשמר בהצלחה' }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/team-events/[id]/attendance POST');
        else console.error('[API] Error in /api/team-events/[id]/attendance POST:', error);
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
        const safeMsg = 'שגיאה בשמירת הגעה';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: IS_PROD ? safeMsg : msg || safeMsg,
        });
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
