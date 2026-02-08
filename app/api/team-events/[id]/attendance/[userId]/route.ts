import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Update Attendance Status API
 * 
 * For organizers to mark attendance (attended/absent) after event
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth';
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
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    findFirst: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
};

function isNexusTeamEventsDelegate(value: unknown): value is NexusTeamEventsDelegate {
    return asObject(value) !== null && hasFunction(value, 'findFirst');
}

function isNexusEventAttendanceDelegate(value: unknown): value is NexusEventAttendanceDelegate {
    return (
        asObject(value) !== null &&
        hasFunction(value, 'updateMany') &&
        hasFunction(value, 'create') &&
        hasFunction(value, 'findFirst')
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

function getNexusEventAttendanceDelegate(): NexusEventAttendanceDelegate {
    const obj = asObject(prisma as unknown);
    const delegate = obj?.['nexus_event_attendance'];
    if (!isNexusEventAttendanceDelegate(delegate)) {
        throw new Error('Prisma delegate nexus_event_attendance is unavailable');
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

async function loadTeamEventInWorkspace(params: { eventId: string; workspaceId: string }) {
    return getNexusTeamEventsDelegate().findFirst({
        where: { id: String(params.eventId), organizationId: String(params.workspaceId) },
    });
}
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: { id: string; userId: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/team-events/[id]/attendance/[userId]');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        const { id: eventId, userId } = params;

        if (!eventId || !userId) {
            return apiError('Event ID and User ID are required', { status: 400 });
        }

        // Get user from database
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserByEmailAndWorkspace({ email: user.email, workspaceId: workspace.id });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Get event to check if user is organizer
        const event = await loadTeamEventInWorkspace({ eventId, workspaceId: workspace.id });
        if (!event) {
            return apiError('אירוע לא נמצא', { status: 404 });
        }

        const eventObj = asObject(event) ?? {};
        const organizerId = String(eventObj.organizer_id ?? '');

        // Check permissions: only organizer or admin can update attendance
        const isOrganizer = organizerId === dbUser.id;
        const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);

        if (!isOrganizer && !isAdmin) {
            return apiError('רק מארגן האירוע יכול לעדכן נוכחות', { status: 403 });
        }

        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};
        const statusRaw = bodyObj.status;
        const status = typeof statusRaw === 'string' ? statusRaw : String(statusRaw ?? '');
        const notesRaw = bodyObj.notes;
        const notes = notesRaw == null ? undefined : String(notesRaw);

        if (!status || !['attended', 'absent'].includes(status)) {
            return apiError('סטטוס לא תקין. צריך להיות attended או absent', { status: 400 });
        }

        const now = new Date();
        const attendedAt = status === 'attended' ? now : null;
        const updateData: Record<string, unknown> = {
            status,
            attended_at: attendedAt,
            ...(notes !== undefined ? { notes } : {}),
            updated_at: now,
        };

        const updated = await getNexusEventAttendanceDelegate().updateMany({
            where: {
                organizationId: String(workspace.id),
                event_id: String(eventId),
                user_id: String(userId),
            },
            data: updateData,
        });

        if (!updated || typeof updated.count !== 'number') {
            return apiError('שגיאה בעדכון נוכחות', { status: 500 });
        }

        if (updated.count < 1) {
            try {
                await getNexusEventAttendanceDelegate().create({
                    data: {
                        organizationId: String(workspace.id),
                        event_id: String(eventId),
                        user_id: String(userId),
                        status,
                        attended_at: attendedAt,
                        ...(notes !== undefined ? { notes } : {}),
                        created_at: now,
                        updated_at: now,
                    },
                });
            } catch (e: unknown) {
                // If row already exists due to race, ignore.
                const code = String(asObject(e)?.code || '');
                if (code !== 'P2002') {
                    if (IS_PROD) console.error('[API] Error creating attendance');
                    else console.error('[API] Error creating attendance:', e);
                    return apiError('שגיאה בעדכון נוכחות', { status: 500 });
                }
            }
        }

        const attendance = await getNexusEventAttendanceDelegate().findFirst({
            where: {
                organizationId: String(workspace.id),
                event_id: String(eventId),
                user_id: String(userId),
            },
        });

        return apiSuccess({ attendance, message: 'נוכחות עודכנה בהצלחה' }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/team-events/[id]/attendance/[userId] PATCH');
        else console.error('[API] Error in /api/team-events/[id]/attendance/[userId] PATCH:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        const msg = getErrorMessage(error);
        const safeMsg = 'שגיאה בעדכון נוכחות';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: IS_PROD ? safeMsg : msg || safeMsg,
        });
    }
}

export const PATCH = shabbatGuard(PATCHHandler);
