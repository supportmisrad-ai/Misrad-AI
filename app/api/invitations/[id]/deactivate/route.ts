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

import { shabbatGuard } from '@/lib/api-shabbat-guard';

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
    } catch (error: any) {
        const code = String((error as any)?.code || (error as any)?.meta?.code || '');
        if (code === '42703') {
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch (authError: any) {
            return apiError('Unauthorized', { status: 401 });
        }

        try {
            await requireSuperAdmin();
        } catch (e: any) {
            return apiError(e?.message || 'Forbidden - Super Admin required', { status: 403 });
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

        const { id } = await params;

        let updatedCount = 0;
        try {
            updatedCount = await deactivateInvitation({ workspaceId: String(workspace.id), invitationId: String(id) });
        } catch (updateError: any) {
            console.error('[API] Error deactivating invitation:', updateError);
            return apiError('Failed to deactivate invitation', { status: 500 });
        }

        if (updatedCount < 1) {
            return apiError('Failed to deactivate invitation', { status: 500 });
        }

        return apiSuccess({ message: 'Invitation link deactivated' });

    } catch (error: any) {
        console.error('[API] Error deactivating invitation:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'Failed to deactivate invitation' });
    }
}


export const POST = shabbatGuard(POSTHandler);
