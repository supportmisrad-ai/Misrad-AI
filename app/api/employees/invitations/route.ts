/**
 * API Route: Get Employee Invitation Links
 * GET /api/employees/invitations
 * 
 * Returns all employee invitation links (filtered by permissions)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { getBaseUrl } from '../../../../lib/utils';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

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
              isSuperAdmin: Boolean((row as any).isSuperAdmin),
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
                const orgSeatsRow = await (prisma as any).social_organizations.findUnique({
                    where: { id: String(workspace.id) },
                    select: { seats_allowed: true },
                });

                seatsAllowedOverride = (orgSeatsRow as any)?.seats_allowed ?? null;

            } catch (e: any) {
                seatsAllowedOverride = null;
            }

            const caps = computeWorkspaceCapabilities({
                entitlements: (ws as any)?.entitlements,
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
        const invitations = await (prisma as any).nexus_employee_invitation_links.findMany({
            where: {
                organizationId: String(workspace.id),
                ...(isAdmin ? {} : { created_by: String(user.id) }),
            },
            orderBy: { created_at: 'desc' },
        });

        // 5. Generate URLs for each invitation
        const baseUrl = getBaseUrl(request);

        const invitationsWithUrls = (invitations || []).map((inv: any) => ({
            id: inv.id,
            token: inv.token,
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
            metadata: inv.metadata || {}
        }));

        return apiSuccess({
            invitations: invitationsWithUrls,
            seatUsage,
        });

    } catch (error: any) {
        console.error('[API] Error in /api/employees/invitations GET:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'Failed to fetch invitations' });
    }
}

export const GET = shabbatGuard(GETHandler);
