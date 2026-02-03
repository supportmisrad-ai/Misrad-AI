/**
 * Announcement Management API
 * 
 * Handles updating and deleting individual announcements
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
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

    const rows = await prisma.$queryRaw<unknown[]>(
        Prisma.sql`
            UPDATE announcements
            SET ${Prisma.join(setParts, ', ')}
            WHERE id = ${String(params.announcementId)}
              AND organization_id = ${String(params.workspaceId)}
            RETURNING *
        `
    );

    const row = Array.isArray(rows) ? rows[0] : null;
    return row ? (asObject(row) ?? row) : null;
}

async function DELETEHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only Super Admins can delete announcements
        if (!user.isSuperAdmin) {
            return apiError('Forbidden - Only Super Admins can delete announcements', { status: 403 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id } = await params;

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
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }
            console.error('[API] Error deleting announcement:', error);
            return apiError('שגיאה במחיקת הודעה', { status: 500 });
        }

        if (!updated) {
            return apiError('הודעה לא נמצאה', { status: 404 });
        }

        return apiSuccess({ ok: true }, { status: 200 });

    } catch (error: unknown) {
        console.error('[API] Error in DELETE /api/announcements/[id]:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: getErrorMessage(error) || 'שגיאה במחיקת הודעה' });
    }
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        
        // Only Super Admins can update announcements
        if (!user.isSuperAdmin) {
            return apiError('Forbidden - Only Super Admins can update announcements', { status: 403 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        const { id } = await params;
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
                return apiError('Announcements table is not configured in the database', { status: 501 });
            }
            console.error('[API] Error updating announcement:', error);
            return apiError('שגיאה בעדכון הודעה', { status: 500 });
        }

        if (!announcement) {
            return apiError('הודעה לא נמצאה', { status: 404 });
        }

        return apiSuccess({ announcement }, { status: 200 });

    } catch (error: unknown) {
        console.error('[API] Error in PATCH /api/announcements/[id]:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: getErrorMessage(error) || 'שגיאה בעדכון הודעה' });
    }
}


export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
