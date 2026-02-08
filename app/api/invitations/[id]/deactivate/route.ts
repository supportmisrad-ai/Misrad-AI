/**
 * API Route: Deactivate Invitation Link
 * POST /api/invitations/[id]/deactivate
 * 
 * Deactivates an invitation link
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../../lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

const IS_PROD = process.env.NODE_ENV === 'production';

async function selectDbUserId(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: { email, organizationId: String(params.workspaceId) },
        select: { id: true },
    });

    return row?.id ? String(row.id) : null;
}

async function deactivateInvitation(params: { workspaceId: string; invitationId: string }) {
    try {
        const res = await prisma.$executeRaw(
            Prisma.sql`
                UPDATE system_invitation_links
                SET is_active = false,
                    updated_at = now()
                WHERE id = ${String(params.invitationId)}
                  AND organization_id = ${String(params.workspaceId)}
            `
        );
        return Number(res || 0);
    } catch (error: unknown) {
        const errObj = asObject(error) ?? {};
        const metaObj = asObject(errObj.meta) ?? {};
        const code = String(errObj.code ?? metaObj.code ?? '');
        if (code === '42P01') {
            if (!ALLOW_SCHEMA_FALLBACKS) {
                throw new Error(`[SchemaMismatch] system_invitation_links missing table (${getErrorMessage(error) || 'missing relation'})`);
            }
            throw error;
        }
        if (code === '42703') {
            if (!ALLOW_SCHEMA_FALLBACKS) {
                throw new Error(`[SchemaMismatch] system_invitation_links.organization_id missing column (${getErrorMessage(error) || 'missing column'})`);
            }
            const res = await prisma.$executeRaw(
                Prisma.sql`
                    UPDATE system_invitation_links
                    SET is_active = false,
                        updated_at = now()
                    WHERE id = ${String(params.invitationId)}
                `
            );
            return Number(res || 0);
        }
        throw error;
    }
}
async function POSTHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch {
            return apiError('Unauthorized', { status: 401 });
        }

        try {
            await requireSuperAdmin();
        } catch (e: unknown) {
            const safeMsg = 'Forbidden - Super Admin required';
            return apiError(IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg, { status: 403 });
        }

        if (!clerkUser.email) {
            return apiError('User email not found', { status: 400 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        // 2. Find user in database by email
        const dbUserId = await selectDbUserId({ workspaceId: workspace.id, email: clerkUser.email });

        if (!dbUserId) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        // Super admin already validated above

        const { id } = params;

        let updatedCount = 0;
        try {
            updatedCount = await deactivateInvitation({
                workspaceId: String(workspace.id), invitationId: String(id)
            });
        } catch (updateError: unknown) {
            if (IS_PROD) console.error('[API] Error deactivating invitation');
            else console.error('[API] Error deactivating invitation:', updateError);
            return apiError('Failed to deactivate invitation', { status: 500 });
        }

        if (updatedCount < 1) {
            return apiError('Failed to deactivate invitation', { status: 500 });
        }

        return apiSuccess({ message: 'Invitation link deactivated' });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error deactivating invitation');
        else console.error('[API] Error deactivating invitation:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : 'Forbidden';
            return apiError(error, { status: error.status, message: IS_PROD ? safeMsg : error.message || safeMsg });
        }
        const safeMsg = 'Failed to deactivate invitation';
        const msg = getErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}


export const POST = shabbatGuard(POSTHandler);
