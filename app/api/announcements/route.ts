/**
 * Announcements API
 * 
 * Handles creating, fetching, and deleting system announcements
 * - All users: recipientType = 'all'
 * - Super Admins only: recipientType = 'super_admins'
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

type UnknownRecord = Record<string, unknown>;

function asObject(value: unknown): UnknownRecord | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as UnknownRecord;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : '';
}

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
            announcements = await prisma.$queryRaw<unknown[]>(
                Prisma.sql`
                    SELECT *
                    FROM announcements
                    WHERE organization_id = ${String(workspace.id)}
                      AND is_active = true
                      AND recipient_type IN (${Prisma.join(recipientTypes)})
                    ORDER BY created_at DESC
                    LIMIT 50
                `
            );
        } catch (error: unknown) {
            if (isMissingTableOrSchemaError(error)) {
                return apiSuccess({ announcements: [] }, { status: 200 });
            }
            console.error('[API] Error fetching announcements:', error);
            return apiError('שגיאה בטעינת הודעות', { status: 500 });
        }

        return apiSuccess({ announcements: announcements || [] }, { status: 200 });

    } catch (error: unknown) {
        console.error('[API] Error in GET /api/announcements:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: getErrorMessage(error) || 'שגיאה בטעינת הודעות' });
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
            const inserted = await prisma.$queryRaw<unknown[]>(
                Prisma.sql`
                    INSERT INTO announcements (organization_id, title, message, recipient_type, created_by, is_active)
                    VALUES (${String(workspace.id)}, ${String(title)}, ${String(message)}, ${String(recipientType)}, ${String(dbUser.id)}, true)
                    RETURNING *
                `
            );
            const first = Array.isArray(inserted) ? inserted[0] : null;
            announcement = first ? expectObject(first, 'Announcement insert failed') : null;
        } catch (error: unknown) {
            if (isMissingTableOrSchemaError(error)) {
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }
            console.error('[API] Error creating announcement:', error);
            return apiError('שגיאה ביצירת הודעה', { status: 500 });
        }

        const announcementObj = expectObject(announcement, 'Announcement insert failed');

        // Create notifications for all eligible users
        const actorName = dbUser.name || 'מערכת';
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

            const notifications = recipientIds.map((recipientId: string) => ({
                organization_id: workspace.id,
                recipient_id: recipientId,
                type: 'system',
                text: title,
                actor_name: actorName,
                related_id: String(announcementObj.id),
                is_read: false,
                metadata: {
                    announcementId: announcementObj.id,
                    message: message
                }
            }));

            try {
                const values = notifications.map((n) =>
                    Prisma.sql`(${n.organization_id}, ${n.recipient_id}, ${n.type}, ${n.text}, ${n.actor_name}, ${n.related_id}, ${n.is_read}, ${JSON.stringify(n.metadata)})`
                );
                await prisma.$executeRaw(
                    Prisma.sql`
                        INSERT INTO misrad_notifications (organization_id, recipient_id, type, text, actor_name, related_id, is_read, metadata)
                        VALUES ${Prisma.join(values)}
                    `
                );
            } catch (notifError: unknown) {
                if (!isMissingTableOrSchemaError(notifError)) {
                    console.error('[API] Error creating notifications:', notifError);
                }
            }

            page += 1;
        }

        return apiSuccess({ announcement }, { status: 201 });

    } catch (error: unknown) {
        console.error('[API] Error in POST /api/announcements:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: getErrorMessage(error) || 'שגיאה ביצירת הודעה' });
    }
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
