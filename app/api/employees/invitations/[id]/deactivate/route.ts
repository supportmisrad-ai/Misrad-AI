import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Deactivate Employee Invitation Link
 * POST /api/employees/invitations/[id]/deactivate
 * 
 * Deactivates an employee invitation link
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function loadUserInWorkspaceByEmail(params: { workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: { email, organizationId: String(params.workspaceId) },
        select: { id: true, role: true, isSuperAdmin: true },
    });

    return row
        ? { id: String(row.id), role: String(row.role || 'עובד'), isSuperAdmin: Boolean(row.isSuperAdmin) }
        : null;
}

async function loadInvitationInWorkspace(params: { workspaceId: string; invitationId: string }) {
    return prisma.nexusEmployeeInvitationLink.findFirst({
        where: { id: String(params.invitationId), organizationId: String(params.workspaceId) },
    });
}

async function deactivateInvitationInWorkspace(params: { workspaceId: string; invitationId: string }) {
    return prisma.nexusEmployeeInvitationLink.updateMany({
        where: { id: String(params.invitationId), organizationId: String(params.workspaceId) },
        data: { is_active: false, updated_at: new Date() },
    });
}
async function POSTHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch (authError: unknown) {
            return apiError('Unauthorized', { status: 401 });
        }

        if (!clerkUser.email) {
            return apiError('User email not found', { status: 400 });
        }

        // 2. Find user in database by email
        const user = await loadUserInWorkspaceByEmail({ workspaceId: workspace.id, email: clerkUser.email });

        if (!user) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        const { id } = params;

        // 3. Check if invitation exists and get it
        const invitation = await loadInvitationInWorkspace({ workspaceId: workspace.id, invitationId: id });

        if (!invitation) {
            return apiError('קישור הזמנה לא נמצא', { status: 404 });
        }

        // 4. Check permissions: user can deactivate their own invitations, admins can deactivate any
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);

        const ws = workspace;
        const flags = await getSystemFeatureFlags();

        let seatsAllowedOverride: number | null = null;
        try {
            const orgId = String(workspace.id || '');
            if (orgId) {
                const orgSeatsRow = await prisma.organization.findUnique({
                    where: { id: orgId },
                    select: { seats_allowed: true },
                });

                seatsAllowedOverride = orgSeatsRow?.seats_allowed ?? null;
            }
        } catch {
            seatsAllowedOverride = null;
        }

        const caps = computeWorkspaceCapabilities({
            entitlements: ws.entitlements,
            fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
            seatsAllowedOverride,
        });

        if (!caps.isTeamManagementEnabled) {
            return apiError('ניהול צוות זמין רק עם מודול Nexus', { status: 403 });
        }

        const isOwner = invitation.created_by === user.id;

        if (!isAdmin && !isOwner) {
            return apiError('אין הרשאה לבטל קישור זה', { status: 403 });
        }

        // 5. Deactivate invitation
        const updateRes = await deactivateInvitationInWorkspace({ workspaceId: workspace.id, invitationId: id });
        if (!updateRes || typeof updateRes.count !== 'number' || updateRes.count < 1) {
            return apiError('שגיאה בביטול קישור הזמנה', { status: 500 });
        }

        return apiSuccess({
            message: 'קישור הזמנה בוטל בהצלחה'
        });

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
                        : error.status === 500
                          ? 'Internal server error'
                          : 'Forbidden';
            return apiError(error, {
                status: error.status,
                message: IS_PROD ? safeMsg : error.message || safeMsg,
            });
        }
        const msg = getUnknownErrorMessage(error) || 'Failed to deactivate invitation';
        const safeMsg = 'Failed to deactivate invitation';
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}


export const POST = shabbatGuard(POSTHandler);
