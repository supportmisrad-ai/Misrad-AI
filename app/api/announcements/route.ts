import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Announcements API
 * 
 * Handles creating, fetching, and deleting system announcements
 * - All users: recipientType = 'all'
 * - Super Admins only: recipientType = 'super_admins'
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma, { executeRawOrgScopedSql, queryRawOrgScopedSql } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

const IS_PROD = process.env.NODE_ENV === 'production';

type UnknownRecord = Record<string, unknown>;

function expectObject(value: unknown, message: string): UnknownRecord {
    const obj = asObject(value);
    if (!obj) throw new Error(message);
    return obj;
}

type DbUser = {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    isSuperAdmin: boolean;
};

function mapDbUserRow(row: unknown): DbUser {
    const r = asObject(row) ?? {};
    return {
        id: r.id ? String(r.id) : '',
        name: r.name ? String(r.name) : null,
        email: r.email ? String(r.email) : null,
        role: r.role ? String(r.role) : null,
        isSuperAdmin: Boolean(r.is_super_admin ?? false),
    };
}

function isMissingTableOrSchemaError(error: unknown): boolean {
    const errObj = asObject(error);
    const metaObj = asObject(errObj?.meta);
    const metaCode = metaObj?.code;
    if (metaCode === '42P01' || metaCode === '42703') return true;
    const msg = getErrorMessage(error).toLowerCase();
    return msg.includes('does not exist') || msg.includes('could not find the table') || msg.includes('schema cache');
}

async function selectUserInWorkspaceByEmail(params: { workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await prisma.nexusUser.findFirst({
        where: { email, organizationId: String(params.workspaceId) },
        select: { id: true, name: true, email: true, role: true, isSuperAdmin: true },
    });

    return byOrg
        ? mapDbUserRow({
              id: byOrg.id,
              name: byOrg.name,
              email: byOrg.email,
              role: byOrg.role,
              is_super_admin: byOrg.isSuperAdmin,
          })
        : null;
}

async function selectUserIdsInWorkspacePage(params: { workspaceId: string; from: number; to: number }) {
    const take = Math.max(0, params.to - params.from + 1);
    if (take === 0) return [];

    const rows = await prisma.nexusUser.findMany({
        where: { organizationId: String(params.workspaceId) },
        select: { id: true },
        orderBy: { id: 'asc' },
        skip: params.from,
        take,
    });

    return (Array.isArray(rows) ? rows : []).map((r) => String(r?.id)).filter(Boolean);
}

async function selectSuperAdminIdsInWorkspace(params: { workspaceId: string; from: number; to: number }) {
    const take = Math.max(0, params.to - params.from + 1);
    if (take === 0) return [];

    const rows = await prisma.nexusUser.findMany({
        where: { organizationId: String(params.workspaceId), isSuperAdmin: true },
        select: { id: true },
        orderBy: { id: 'asc' },
        skip: params.from,
        take,
    });

    return (Array.isArray(rows) ? rows : []).map((r) => String(r?.id)).filter(Boolean);
}
async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        // Get user from database by email
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserInWorkspaceByEmail({ workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return apiSuccess({ announcements: [] }, { status: 200 });
        }

        // Determine which announcements to show
        const isSuperAdmin = dbUser.isSuperAdmin === true;
        
        const recipientTypes = isSuperAdmin ? ['all', 'super_admins'] : ['all'];

        let announcements: unknown[] = [];
        try {
            announcements = await queryRawOrgScopedSql<unknown[]>(prisma, {
                organizationId: String(workspace.id),
                reason: 'announcements_list',
                sql: Prisma.sql`
                    SELECT *
                    FROM announcements
                    WHERE organization_id = $organizationId$
                      AND is_active = true
                      AND recipient_type IN (${Prisma.join(recipientTypes)})
                    ORDER BY created_at DESC
                    LIMIT 50
                `,
            });
        } catch (error: unknown) {
            if (isMissingTableOrSchemaError(error)) {
                if (!ALLOW_SCHEMA_FALLBACKS) {
                    throw new Error(`[SchemaMismatch] announcements missing table/column (${getErrorMessage(error) || 'missing relation'})`);
                }
                reportSchemaFallback({
                    source: 'api/announcements',
                    reason: 'announcements missing table/column (GET)',
                    error,
                    extras: { workspaceId: workspace.id },
                });
                return apiSuccess({ announcements: [] }, { status: 200 });
            }
            if (IS_PROD) console.error('[API] Error fetching announcements');
            else console.error('[API] Error fetching announcements:', error);
            return apiError('שגיאה בטעינת הודעות', { status: 500 });
        }

        return apiSuccess({ announcements: announcements || [] }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in GET /api/announcements');
        else console.error('[API] Error in GET /api/announcements:', error);
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
        const safeMsg = 'שגיאה בטעינת הודעות';
        const msg = getErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspace } = await getWorkspaceOrThrow(request);

        // Get user from database first to check permissions
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserInWorkspaceByEmail({ workspaceId: workspace.id, email: user.email });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        // Only Super Admins can create announcements
        if (!dbUser.isSuperAdmin) {
            return apiError('Forbidden - Only Super Admins can create announcements', { status: 403 });
        }

        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};
        const title = String(bodyObj.title ?? '').trim();
        const message = String(bodyObj.message ?? '').trim();
        const recipientType = String(bodyObj.recipientType ?? '').trim();

        if (!title || !message || !recipientType) {
            return apiError('Missing required fields: title, message, recipientType', { status: 400 });
        }

        if (!['all', 'super_admins'].includes(recipientType)) {
            return apiError('Invalid recipientType. Must be "all" or "super_admins"', { status: 400 });
        }

        let announcement: UnknownRecord | null;
        try {
            const inserted = await queryRawOrgScopedSql<unknown[]>(prisma, {
                organizationId: String(workspace.id),
                reason: 'announcements_insert',
                sql: Prisma.sql`
                    INSERT INTO announcements (organization_id, title, message, recipient_type, created_by, is_active)
                    VALUES ($organizationId$, ${String(title)}, ${String(message)}, ${String(recipientType)}, ${String(dbUser.id)}, true)
                    RETURNING *
                `,
            });
            const first = Array.isArray(inserted) ? inserted[0] : null;
            announcement = first ? expectObject(first, 'Announcement insert failed') : null;
        } catch (error: unknown) {
            if (isMissingTableOrSchemaError(error)) {
                if (!ALLOW_SCHEMA_FALLBACKS) {
                    throw new Error(`[SchemaMismatch] announcements missing table/column (${getErrorMessage(error) || 'missing relation'})`);
                }
                reportSchemaFallback({
                    source: 'api/announcements',
                    reason: 'announcements missing table/column (POST)',
                    error,
                    extras: { workspaceId: workspace.id },
                });
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }
            if (IS_PROD) console.error('[API] Error creating announcement');
            else console.error('[API] Error creating announcement:', error);
            return apiError('שגיאה ביצירת הודעה', { status: 500 });
        }

        const announcementObj = expectObject(announcement, 'Announcement insert failed');

        // Create notifications for all eligible users
        const pageSize = 1000;
        let page = 0;
        while (true) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            const recipientIds =
                recipientType === 'all'
                    ? await selectUserIdsInWorkspacePage({ workspaceId: workspace.id, from, to })
                    : await selectSuperAdminIdsInWorkspace({ workspaceId: workspace.id, from, to });

            if (recipientIds.length === 0) break;

            const nowIso = new Date().toISOString();
            const notifications = recipientIds.map((recipientId: string) => ({
                organization_id: workspace.id,
                recipient_id: recipientId,
                type: 'SYSTEM',
                title: title,
                message: message || title,
                timestamp: nowIso,
                is_read: false,
                link: null as string | null,
            }));

            try {
                const values = notifications.map((n) =>
                    Prisma.sql`(uuid_generate_v4(), ${n.organization_id}::uuid, ${n.recipient_id}::uuid, ${n.type}, ${n.title}, ${n.message}, ${n.timestamp}, ${n.is_read}, now(), now())`
                );
                await executeRawOrgScopedSql(prisma, {
                    organizationId: String(workspace.id),
                    reason: 'misrad_notifications_insert_announcement',
                    sql: Prisma.sql`
                        INSERT INTO misrad_notifications (id, organization_id, recipient_id, type, title, message, "timestamp", is_read, created_at, updated_at)
                        VALUES ${Prisma.join(values)}
                    `,
                });
            } catch (notifError: unknown) {
                if (isMissingTableOrSchemaError(notifError)) {
                    if (!ALLOW_SCHEMA_FALLBACKS) {
                        throw new Error(`[SchemaMismatch] misrad_notifications missing table/column (${getErrorMessage(notifError) || 'missing relation'})`);
                    }
                    reportSchemaFallback({
                        source: 'api/announcements',
                        reason: 'misrad_notifications missing table/column (createMany ignored)',
                        error: notifError,
                        extras: { workspaceId: workspace.id },
                    });
                } else {
                    if (IS_PROD) console.error('[API] Error creating notifications');
                    else console.error('[API] Error creating notifications:', notifError);
                }
            }

            page += 1;
        }

        return apiSuccess({ announcement }, { status: 201 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in POST /api/announcements');
        else console.error('[API] Error in POST /api/announcements:', error);
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
        const safeMsg = 'שגיאה ביצירת הודעה';
        const msg = getErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
