/**
 * Secure Financial Data API
 * 
 * Server-side API with strict authorization
 * Only users with 'view_financials' permission can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, hasPermission } from '../../../lib/auth';
import { logAuditEvent, logSensitiveAccess } from '../../../lib/audit';
import { getFinanceOverviewData } from '@/lib/services/finance-service';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        const headerOrgId = request.headers.get('x-org-id');
        const queryOrgId = request.nextUrl.searchParams.get('orgId');
        const effectiveOrgId = headerOrgId || queryOrgId;
        if (!effectiveOrgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(effectiveOrgId);
        
        // 2. Check permissions - STRICT: Only financial permission
        const canViewFinancials = await hasPermission('view_financials');
        if (!canViewFinancials) {
            const userRole = user.role || 'עובד';
            await logAuditEvent('data.read', 'financial', {
                success: false,
                error: `Forbidden - Missing view_financials permission. Current role: ${userRole}`
            });
            return NextResponse.json(
                {
                    error: 'Forbidden - Financial data access required',
                    details: `Your role "${userRole}" does not have view_financials permission. Please set your role in Clerk Dashboard.`
                },
                { status: 403 }
            );
        }
        
        // 3. Log sensitive access
        await logSensitiveAccess('financial', 'all', ['salary', 'bonus', 'revenue']);
        await logAuditEvent('data.read', 'financial', {
            success: true,
            details: { accessedBy: user.id }
        });
        
        // 4. Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const department = searchParams.get('department');
        const dateRange = searchParams.get('dateRange'); // e.g., "2024-01-01,2024-01-31"

        const dateFrom = dateRange?.split(',')[0];
        const dateTo = dateRange?.split(',')[1];

        // 6. Filter by user if requested
        if (userId) {
            // Check if user can view this specific user's financial data
            const isManager = await hasPermission('manage_team');
            if (userId !== user.id && !isManager) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const financialData = await getFinanceOverviewData({
            organizationId: workspace.id,
            userId: userId || null,
            department: department || null,
            dateRange: {
                from: dateFrom,
                to: dateTo,
            },
        });

        if (userId) {
            const userFinancials = financialData.users.find((u: any) => String(u.user?.id) === String(userId));
            if (!userFinancials) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            return NextResponse.json({
                user: userFinancials,
                totalCost: userFinancials.estimatedCost || 0,
            });
        }
        
        // 7. Filter by department if requested (already done in getFinancialData)
        // 8. Return aggregated financial data
        return NextResponse.json({
            financials: financialData,
            accessedBy: user.id,
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        await logAuditEvent('data.read', 'financial', {
            success: false,
            error: error.message
        });
        
        if (error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        if (error.message.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

