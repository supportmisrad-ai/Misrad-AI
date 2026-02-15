import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Announcement Management API
 * 
 * Handles updating and deleting individual announcements
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma, { queryRawOrgScopedSql } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

const IS_PROD = process.env.NODE_ENV === 'production';

type UnknownRecord = Record<string, unknown>;

function isMissingTableOrSchemaError(error: unknown): boolean {
    const errObj = asObject(error);
    const metaObj = asObject(errObj?.meta);
    const metaCode = metaObj?.code;
    if (metaCode === '42P01' || metaCode === '42703') return true;
    const msg = getErrorMessage(error).toLowerCase();
    return msg.includes('does not exist') || msg.includes('could not find the table') || msg.includes('schema cache');
}

async function updateAnnouncementInWorkspace(params: { announcementId: string; workspaceId: string; patch: unknown }) {
    const patchObj = asObject(params.patch) ?? {};
    const setParts: Prisma.Sql[] = [];
    if (patchObj.title !== undefined) setParts.push(Prisma.sql`title = ${String(patchObj.title)}`);
    if (patchObj.message !== undefined) setParts.push(Prisma.sql`message = ${String(patchObj.message)}`);
    if (patchObj.is_active !== undefined) setParts.push(Prisma.sql`is_active = ${Boolean(patchObj.is_active)}`);
    if (setParts.length === 0) return null;

    const rows = await queryRawOrgScopedSql<unknown[]>(prisma, {
        organizationId: String(params.workspaceId),
        reason: 'announcements_update',
        sql: Prisma.sql`
            UPDATE announcements
            SET ${Prisma.join(setParts, ', ')}
            WHERE id = ${String(params.announcementId)}
              AND organization_id = $organizationId$
            RETURNING *
        `,
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    return row ? (asObject(row) ?? row) : null;
}

async function DELETEHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only Super Admins can delete announcements
        if (!user.isSuperAdmin) {
            return apiError('Forbidden - Only Super Admins can delete announcements', { status: 403 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id } = params;

        // Soft delete - set is_active to false
        let updated: unknown;
        try {
            updated = await updateAnnouncementInWorkspace({
            announcementId: id,
            workspaceId: workspace.id,
            patch: { is_active: false },
            });
        } catch (error: unknown) {
            if (isMissingTableOrSchemaError(error)) {
                if (!ALLOW_SCHEMA_FALLBACKS) {
                    throw new Error(`[SchemaMismatch] announcements missing table/column (${getErrorMessage(error) || 'missing relation'})`);
                }
                reportSchemaFallback({
                    source: 'api/announcements/[id]',
                    reason: 'announcements missing table/column (DELETE)',
                    error,
                    extras: { workspaceId: workspace.id, announcementId: id },
                });
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }
            if (IS_PROD) console.error('[API] Error deleting announcement');
            else console.error('[API] Error deleting announcement:', error);
            return apiError('שגיאה במחיקת הודעה', { status: 500 });
        }

        if (!updated) {
            return apiError('הודעה לא נמצאה', { status: 404 });
        }

        return apiSuccess({ ok: true }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in DELETE /api/announcements/[id]');
        else console.error('[API] Error in DELETE /api/announcements/[id]:', error);
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
        const safeMsg = 'שגיאה במחיקת הודעה';
        const msg = getErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only Super Admins can update announcements
        if (!user.isSuperAdmin) {
            return apiError('Forbidden - Only Super Admins can update announcements', { status: 403 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id } = params;
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};

        const allowedUpdates: UnknownRecord = {};
        if (bodyObj.title !== undefined) allowedUpdates.title = bodyObj.title;
        if (bodyObj.message !== undefined) allowedUpdates.message = bodyObj.message;
        if (bodyObj.is_active !== undefined) allowedUpdates.is_active = bodyObj.is_active;

        let announcement: unknown;
        try {
            announcement = await updateAnnouncementInWorkspace({
                announcementId: id,
                workspaceId: workspace.id,
                patch: allowedUpdates,
            });
        } catch (error: unknown) {
            if (isMissingTableOrSchemaError(error)) {
                if (!ALLOW_SCHEMA_FALLBACKS) {
                    throw new Error(`[SchemaMismatch] announcements missing table/column (${getErrorMessage(error) || 'missing relation'})`);
                }
                reportSchemaFallback({
                    source: 'api/announcements/[id]',
                    reason: 'announcements missing table/column (PATCH)',
                    error,
                    extras: { workspaceId: workspace.id, announcementId: id },
                });
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }
            if (IS_PROD) console.error('[API] Error updating announcement');
            else console.error('[API] Error updating announcement:', error);
            return apiError('שגיאה בעדכון הודעה', { status: 500 });
        }

        if (!announcement) {
            return apiError('הודעה לא נמצאה', { status: 404 });
        }

        return apiSuccess({ announcement }, { status: 200 });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in PATCH /api/announcements/[id]');
        else console.error('[API] Error in PATCH /api/announcements/[id]:', error);
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
        const safeMsg = 'שגיאה בעדכון הודעה';
        const msg = getErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}


export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
