/**
 * API Route: Get Employee Invitation Links
 * GET /api/employees/invitations
 * 
 * Returns all employee invitation links (filtered by permissions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { getUsers } from '../../../../lib/db';
import { supabase } from '../../../../lib/supabase';
import { getBaseUrl } from '../../../../lib/utils';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export async function GET(request: NextRequest) {
    try {
        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');

        // 1. Authenticate user
        const clerkUser = await getAuthenticatedUser();
        
        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // 2. Find user in database
        // Tenant-scope the nexus_users lookup when org context exists.
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        }

        const dbUsers = await getUsers({ email: clerkUser.email, tenantId: workspaceId || undefined });
        const user = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // 3. Check if user is admin or manager
        const isAdmin = user.isSuperAdmin || 
                       user.role === 'מנכ״ל' || 
                       user.role === 'מנכ"ל' || 
                       user.role === 'אדמין';

        // Tenant route: require explicit org context for non-super-admin to avoid cross-tenant leakage.
        let workspace: { id: string } | null = null;
        if (orgIdFromHeader) {
            workspace = { id: String(workspaceId) };
        } else if (!user.isSuperAdmin) {
            return NextResponse.json(
                { error: 'Missing x-org-id header' },
                { status: 400 }
            );
        }

        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        // 4. Build query
        let query = supabase
            .from('nexus_employee_invitation_links')
            .select('*')
            .order('created_at', { ascending: false });

        if (workspace?.id) {
            query = query.eq('organization_id', workspace.id);
        }

        // If not admin, only show own invitations
        if (!isAdmin) {
            query = query.eq('created_by', user.id);
        }

        const { data: invitations, error } = await query;

        if (error) {
            console.error('[API] Error fetching employee invitations:', error);
            return NextResponse.json(
                { error: 'שגיאה בטעינת קישורי הזמנה' },
                { status: 500 }
            );
        }

        // 5. Generate URLs for each invitation
        const baseUrl = getBaseUrl(request);

        const invitationsWithUrls = (invitations || []).map((inv: any) => ({
            id: inv.id,
            token: inv.token,
            url: `${baseUrl}/employee-invite/${inv.token}`,
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

        return NextResponse.json({
            invitations: invitationsWithUrls
        });

    } catch (error: any) {
        console.error('[API] Error in /api/employees/invitations GET:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת קישורי הזמנה' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
