import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Team Events API
 * 
 * Handles CRUD operations for team events (training, fun days, group meetings, etc.)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import { TeamEvent, TeamEventStatus, TeamEventType } from '../../../types';
import prisma, { executeRawOrgScoped } from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { assertNoProdEntitlementsBypass, isBypassModuleEntitlementsEnabled, isE2eTestingEnv } from '@/lib/server/workspace';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import type { Prisma } from '@prisma/client';

const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

function hasFunction(value: unknown, name: string): value is Record<string, (...args: unknown[]) => unknown> {
    const obj = asObject(value);
    const fn = obj?.[name];
    return typeof fn === 'function';
}

type NexusTeamEventsDelegate = {
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>>;
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
};

type NexusEventAttendanceDelegate = {
    createMany: (args: { data: Array<Record<string, unknown>>; skipDuplicates?: boolean }) => Promise<unknown>;
};

function isNexusTeamEventsDelegate(value: unknown): value is NexusTeamEventsDelegate {
    return (
        asObject(value) !== null &&
        hasFunction(value, 'findMany') &&
        hasFunction(value, 'create')
    );
}

function isNexusEventAttendanceDelegate(value: unknown): value is NexusEventAttendanceDelegate {
    return asObject(value) !== null && hasFunction(value, 'createMany');
}

function getNexusTeamEventsDelegate(): NexusTeamEventsDelegate {
    const client = prisma as unknown;
    const obj = asObject(client);
    const delegate = obj?.['nexus_team_events'];
    if (!isNexusTeamEventsDelegate(delegate)) {
        throw new Error('Prisma delegate nexus_team_events is unavailable');
    }
    return delegate;
}

function getNexusEventAttendanceDelegate(): NexusEventAttendanceDelegate {
    const client = prisma as unknown;
    const obj = asObject(client);
    const delegate = obj?.['nexus_event_attendance'];
    if (!isNexusEventAttendanceDelegate(delegate)) {
        throw new Error('Prisma delegate nexus_event_attendance is unavailable');
    }
    return delegate;
}

function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
    const v = obj[key];
    return typeof v === 'string' ? v : String(v ?? fallback);
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
}

type DbUser = {
    id: string;
    name: string;
    role: string;
    isSuperAdmin: boolean;
    tenantId?: string | null;
};

function mapNexusUserRow(row: unknown): DbUser {
    const obj = asObject(row) ?? {};
    return {
        id: getString(obj, 'id'),
        name: getString(obj, 'name', getString(obj, 'full_name', getString(obj, 'email'))),
        role: getString(obj, 'role', 'עובד'),
        isSuperAdmin: Boolean(obj['is_super_admin'] ?? obj['isSuperAdmin'] ?? false),
        tenantId: getNullableString(obj, 'organization_id') ?? getNullableString(obj, 'organizationId'),
    };
}

async function resolveOrCreateDbUser(params: {
    organizationId: string;
    email: string;
    authUser: unknown;
}): Promise<DbUser | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const authObj = asObject(params.authUser) ?? {};

    const existing = await prisma.nexusUser.findFirst({
        where: { organizationId: params.organizationId, email },
    });
    if (existing?.id) {
        return mapNexusUserRow(existing);
    }

    const nowIso = new Date().toISOString();
    const name =
        getNullableString(authObj, 'firstName') && getNullableString(authObj, 'lastName')
            ? `${String(getNullableString(authObj, 'firstName') || '')} ${String(getNullableString(authObj, 'lastName') || '')}`.trim()
            : getNullableString(authObj, 'firstName') || getNullableString(authObj, 'lastName') || email;

    const role = getNullableString(authObj, 'role') ?? 'עובד';
    const avatarUrl = getNullableString(authObj, 'imageUrl');
    const isSuperAdmin = Boolean(authObj['isSuperAdmin']);

    const created = await prisma.nexusUser.create({
        data: {
            organizationId: params.organizationId,
            name,
            email,
            role,
            avatar: avatarUrl || null,
            online: true,
            capacity: 0,
            isSuperAdmin,
            createdAt: new Date(nowIso),
            updatedAt: new Date(nowIso),
        },
    });

    if (!created?.id) return null;
    return mapNexusUserRow(created);
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

async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/team-events');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        // Get user from database by email
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await resolveOrCreateDbUser({ organizationId: workspace.id, email: user.email, authUser: user });

        if (!dbUser || !dbUser.tenantId) {
            // Return empty array instead of error - user might not be synced yet
            return apiSuccess({ events: [] }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const eventType = searchParams.get('event_type');
        const status = searchParams.get('status');

        const where: Record<string, unknown> = { organizationId: workspace.id };
        if (startDate) {
            const d = new Date(String(startDate));
            if (Number.isFinite(d.getTime())) {
                const prev = asObject(where.start_date) ?? {};
                where.start_date = { ...prev, gte: d };
            }
        }
        if (endDate) {
            const d = new Date(String(endDate));
            if (Number.isFinite(d.getTime())) {
                const prev = asObject(where.end_date) ?? {};
                where.end_date = { ...prev, lte: d };
            }
        }
        if (eventType) {
            where.event_type = String(eventType);
        }
        if (status) {
            where.status = String(status);
        }

        const rows = await getNexusTeamEventsDelegate().findMany({ where, orderBy: { start_date: 'asc' } });

        const events = (Array.isArray(rows) ? rows : []).map(mapTeamEventRow);
        return apiSuccess({ events }, { status: 200 });

    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        if (IS_PROD) console.error('[API] Error in /api/team-events GET');
        else console.error('[API] Error in /api/team-events GET:', { message: msg });
        if (error instanceof APIError) {
            const safeMsg = error.status === 401 ? 'Unauthorized' : 'Forbidden';
            return apiError(IS_PROD ? safeMsg : error, {
                status: error.status,
                message: IS_PROD ? safeMsg : msg || error.message || safeMsg,
            });
        }
        if (msg.includes('Tenant Isolation') || msg.includes('No tenant scoping column')) {
            if (!ALLOW_SCHEMA_FALLBACKS) {
                return apiError(error, {
                    status: 500,
                    message: `[SchemaMismatch] team-events query failed (${msg || 'missing tenant scoping column'})`,
                });
            }
            return apiSuccess({ events: [] }, { status: 200 });
        }
        const safeMsg = 'שגיאה בטעינת אירועים';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: safeMsg,
        });
    }
}

async function bestEffortInsertLegacyNotification(params: {
    organizationId: string;
    recipientId: string;
    type: string;
    text: string;
    actorName?: string | null;
    relatedId?: string | null;
}): Promise<void> {
    const nowIso = new Date().toISOString();
    await executeRawOrgScoped(prisma, {
        organizationId: String(params.organizationId),
        reason: 'team_events_notification_insert_legacy',
        query: `
            insert into misrad_notifications
              (organization_id, recipient_id, type, text, actor_name, related_id, is_read, created_at, updated_at)
            values
              ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::uuid, false, $7::timestamptz, $7::timestamptz)
        `,
        values: [
            String(params.organizationId),
            String(params.recipientId),
            String(params.type),
            String(params.text),
            params.actorName ? String(params.actorName) : null,
            params.relatedId ? String(params.relatedId) : null,
            nowIso,
        ],
    });
}

async function bestEffortInsertModernNotification(params: {
    organizationId: string;
    recipientId: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string | null;
}): Promise<void> {
    const now = new Date();
    type NotificationType = Prisma.MisradNotificationCreateInput['type'];
    const data = {
        organization_id: String(params.organizationId),
        recipient_id: String(params.recipientId),
        type: String(params.type) as NotificationType,
        title: String(params.title),
        message: String(params.message),
        timestamp: now.toISOString(),
        isRead: false,
        link: params.relatedId ? String(params.relatedId) : null,
        created_at: now,
        updated_at: now,
    } satisfies Prisma.MisradNotificationCreateInput;

    await prisma.misradNotification.create({
        data,
        select: { id: true },
    });
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/team-events#post');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        // Get user from database by email
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await resolveOrCreateDbUser({ organizationId: workspace.id, email: user.email, authUser: user });
        if (!dbUser) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        const body: unknown = await request.json().catch(() => ({}));
        const bodyObj = asObject(body) ?? {};

        const title = getString(bodyObj, 'title');
        const description = getNullableString(bodyObj, 'description') ?? null;
        const eventType = getString(bodyObj, 'eventType');
        const startDate = getString(bodyObj, 'startDate');
        const endDate = getString(bodyObj, 'endDate');
        const allDay = Boolean(bodyObj['allDay'] ?? false);
        const location = getNullableString(bodyObj, 'location') ?? null;
        const status = getString(bodyObj, 'status', 'scheduled');
        const requiresApproval = Boolean(bodyObj['requiresApproval'] ?? false);
        const reminderDaysBeforeRaw = bodyObj['reminderDaysBefore'];
        const reminderDaysBefore = Number.isFinite(Number(reminderDaysBeforeRaw)) ? Number(reminderDaysBeforeRaw) : 1;

        const requiredAttendees = Array.isArray(bodyObj['requiredAttendees'])
            ? (bodyObj['requiredAttendees'] as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];
        const optionalAttendees = Array.isArray(bodyObj['optionalAttendees'])
            ? (bodyObj['optionalAttendees'] as unknown[]).map((x) => String(x)).filter(Boolean)
            : [];

        const metadataRaw = bodyObj['metadata'];
        const metadata = asObject(metadataRaw) ?? {};

        // Validation
        if (!title || !eventType || !startDate || !endDate) {
            return apiError('כותרת, סוג אירוע, תאריך התחלה ותאריך סיום נדרשים', { status: 400 });
        }

        const start = new Date(String(startDate));
        const end = new Date(String(endDate));
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
            return apiError('תאריכים לא תקינים', { status: 400 });
        }

        const eventRow = await getNexusTeamEventsDelegate().create({
            data: {
                organizationId: workspace.id,
                title,
                description,
                event_type: eventType,
                start_date: start,
                end_date: end,
                all_day: allDay,
                location,
                organizer_id: dbUser.id,
                required_attendees: requiredAttendees,
                optional_attendees: optionalAttendees,
                status,
                requires_approval: requiresApproval,
                reminder_days_before: reminderDaysBefore,
                metadata,
                created_by: dbUser.id,
            },
        });

        if (!eventRow?.id) {
            return apiError('שגיאה ביצירת אירוע', { status: 500 });
        }

        const event = mapTeamEventRow(eventRow);

        // Create attendance records for required and optional attendees
        if (event && (requiredAttendees.length > 0 || optionalAttendees.length > 0)) {
            const allAttendees = [...requiredAttendees, ...optionalAttendees];
            try {
                await getNexusEventAttendanceDelegate().createMany({
                    data: allAttendees.map((attendeeId: string) => ({
                        organizationId: workspace.id,
                        event_id: event.id,
                        user_id: attendeeId,
                        status: 'invited',
                    })),
                    skipDuplicates: true,
                });
            } catch (attendanceError) {
                if (IS_PROD) console.error('[API] Error creating attendance records');
                else console.error('[API] Error creating attendance records:', attendanceError);
            }
        }

        // Send notifications to required attendees
        // Notifications are best-effort and schema-dependent; do not fail the request.
        if (event && requiredAttendees.length > 0) {
            try {
                const organizerName = dbUser?.name || 'מערכת';
                for (const attendeeId of requiredAttendees.filter((x: string) => String(x) !== String(dbUser.id))) {
                    const text = `הוזמנת לאירוע: ${title}`;
                    try {
                        await bestEffortInsertLegacyNotification({
                            organizationId: workspace.id,
                            recipientId: attendeeId,
                            type: 'team_event',
                            text,
                            actorName: organizerName,
                            relatedId: event.id,
                        });
                    } catch {
                        try {
                            await bestEffortInsertModernNotification({
                                organizationId: workspace.id,
                                recipientId: attendeeId,
                                type: 'SYSTEM',
                                title: 'team_event',
                                message: text,
                                relatedId: event.id,
                            });
                        } catch (e: unknown) {
                            if (IS_PROD) console.warn('[API] Could not create event notification (ignored)');
                            else console.warn('[API] Could not create event notification (ignored):', e);
                        }
                    }
                }
            } catch (notifError: unknown) {
                if (IS_PROD) console.warn('[API] Error sending event notifications (ignored)');
                else console.warn('[API] Error sending event notifications (ignored):', notifError);
            }
        }

        return apiSuccess({ event, message: 'אירוע נוצר בהצלחה' }, { status: 201 });

    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        if (IS_PROD) console.error('[API] Error in /api/team-events POST');
        else console.error('[API] Error in /api/team-events POST:', { message: msg });
        if (error instanceof APIError) {
            const safeMsg = error.status === 401 ? 'Unauthorized' : 'Forbidden';
            return apiError(IS_PROD ? safeMsg : error, {
                status: error.status,
                message: IS_PROD ? safeMsg : msg || error.message || safeMsg,
            });
        }
        const safeMsg = 'שגיאה ביצירת אירוע';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: safeMsg,
        });
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
