import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Get Employee Invitation Links
 * GET /api/employees/invitations
 * 
 * Returns all employee invitation links (filtered by permissions)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import type { nexus_employee_invitation_links } from '@prisma/client';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function loadUserInWorkspaceByEmail(params: { workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const row = await prisma.nexusUser.findFirst({
        where: { email, organizationId: String(params.workspaceId) },
        select: { id: true, name: true, email: true, role: true, isSuperAdmin: true },
    });

    return row
        ? {
              id: String(row.id),
              name: row.name,
              email: row.email,
              role: row.role,
              isSuperAdmin: Boolean(row.isSuperAdmin),
          }
        : null;
}
async function GETHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        // 1. Authenticate user
        const clerkUser = await getAuthenticatedUser();
        
        if (!clerkUser.email) {
            return apiError('User email not found', { status: 400 });
        }

        // 2. Find user in database
        const user = await loadUserInWorkspaceByEmail({ workspaceId: workspace.id, email: clerkUser.email });

        if (!user) {
            return apiError('User not found in database', { status: 404 });
        }

        // 3. Check if user is admin or manager
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);

        let seatUsage: { activeUsers: number; seatsAllowed: number } | null = null;
        if (workspace?.id) {
            const ws = workspace;
            const flags = await getSystemFeatureFlags();

            let seatsAllowedOverride: number | null = null;
            try {
                const orgSeatsRow = await prisma.organization.findUnique({
                    where: { id: String(workspace.id) },
                    select: { seats_allowed: true },
                });

                seatsAllowedOverride = orgSeatsRow?.seats_allowed ?? null;

            } catch (e: unknown) {
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

            const activeUsers = await countOrganizationActiveUsers(String(workspace.id));
            seatUsage = { activeUsers, seatsAllowed: caps.seatsAllowed };
        }

        // 4. Build query
        const invitations = await prisma.nexus_employee_invitation_links.findMany({
            where: {
                organizationId: String(workspace.id),
                ...(isAdmin ? {} : { created_by: String(user.id) }),
            },
            orderBy: { created_at: 'desc' },
        });

        // 5. Generate URLs for each invitation
        const baseUrl = getBaseUrl(request);

        const invitationsWithUrls = (invitations || []).map((inv: nexus_employee_invitation_links) => ({
            id: String(inv.id),
            token: String(inv.token),
            url: `${baseUrl}/login?mode=sign-up&email=${encodeURIComponent(String(inv.employee_email || ''))}&invited=true&employee=true&redirect=${encodeURIComponent(`/employee-invite/${encodeURIComponent(String(inv.token))}/finalize`)}`,
            employeeEmail: inv.employee_email,
            employeeName: inv.employee_name,
            employeePhone: inv.employee_phone,
            department: inv.department,
            role: inv.role,
            paymentType: inv.payment_type,
            hourlyRate: inv.hourly_rate,
            monthlySalary: inv.monthly_salary,
            commissionPct: inv.commission_pct,
            startDate: inv.start_date,
            notes: inv.notes,
            createdBy: inv.created_by,
            createdAt: inv.created_at,
            expiresAt: inv.expires_at,
            usedAt: inv.used_at,
            isUsed: inv.is_used,
            isActive: inv.is_active,
            metadata: inv.metadata || {},
        }));

        return apiSuccess({
            invitations: invitationsWithUrls,
            seatUsage,
        });

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/employees/invitations GET');
        else console.error('[API] Error in /api/employees/invitations GET:', error);
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
        const msg = getUnknownErrorMessage(error) || 'Failed to fetch invitations';
        const safeMsg = 'Failed to fetch invitations';
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}

export const GET = shabbatGuard(GETHandler);
