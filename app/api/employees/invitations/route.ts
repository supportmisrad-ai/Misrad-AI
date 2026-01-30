/**
 * API Route: Get Employee Invitation Links
 * GET /api/employees/invitations
 * 
 * Returns all employee invitation links (filtered by permissions)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createClient } from '../../../../lib/supabase';
import { getBaseUrl } from '../../../../lib/utils';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function loadUserInWorkspaceByEmail(params: { supabase: any; workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id, name, email, role, is_super_admin')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data ? { ...byOrg.data, isSuperAdmin: Boolean((byOrg.data as any).is_super_admin) } : null;
}
async function GETHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        let supabase: any;
        try {
            supabase = createClient();
        } catch {
            return apiError('Database not configured', { status: 500 });
        }

        // 1. Authenticate user
        const clerkUser = await getAuthenticatedUser();
        
        if (!clerkUser.email) {
            return apiError('User email not found', { status: 400 });
        }

        // 2. Find user in database
        const user = await loadUserInWorkspaceByEmail({ supabase, workspaceId: workspace.id, email: clerkUser.email });

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
                const { data: orgSeatsRow, error: orgSeatsError } = await supabase
                    .from('organizations')
                    .select('seats_allowed')
                    .eq('id', workspace.id)
                    .maybeSingle();

                if (orgSeatsError?.code === '42703') {
                    throw new Error('[SchemaMismatch] organizations is missing seats_allowed');
                }

                if (!orgSeatsError) {
                    seatsAllowedOverride = (orgSeatsRow as any)?.seats_allowed ?? null;
                }

            } catch (e: any) {
                if (String(e?.message || '').includes('[SchemaMismatch]')) {
                    throw e;
                }
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
        let query = supabase
            .from('nexus_employee_invitation_links')
            .select('*')
            .order('created_at', { ascending: false });

        query = query.eq('organization_id', workspace.id);

        // If not admin, only show own invitations
        if (!isAdmin) {
            query = query.eq('created_by', user.id);
        }

        const { data: invitations, error } = await query;

        if (error?.code === '42703') {
            return apiError('[SchemaMismatch] nexus_employee_invitation_links is missing organization_id', { status: 500 });
        }

        if (error) {
            console.error('[API] Error fetching employee invitations:', error);
            return apiError('שגיאה בטעינת קישורי הזמנה', { status: 500 });
        }

        // 5. Generate URLs for each invitation
        const baseUrl = getBaseUrl(request);

        const invitationsWithUrls = (invitations || []).map((inv: any) => ({
            id: inv.id,
            token: inv.token,
            url: `${baseUrl}/sign-up?email=${encodeURIComponent(String(inv.employee_email || ''))}&invited=true&employee=true&redirect_url=${encodeURIComponent(`${baseUrl}/employee-invite/${encodeURIComponent(String(inv.token))}/finalize`)}`,
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
