import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import prisma, { queryRawOrgScoped } from '@/lib/prisma';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getRoleLevel } from '@/lib/constants/roles';

export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * GET /api/workspaces/[orgSlug]/ai/reports
 * 
 * Returns AI periodic reports for the current org.
 * - Admins see all org reports (type = 'admin_monthly')
 * - Employees see only their own (type = 'employee_monthly')
 * 
 * Query params:
 *   ?limit=10  — max reports to return (default 10, max 50)
 *   ?type=admin_monthly|employee_monthly  — filter by type
 */
async function GETHandler(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) return apiError('Unauthorized', { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const { workspace } = await getWorkspaceContextOrThrow(req, { params: resolvedParams });
    const organizationId = workspace.id;

    const url = new URL(req.url);
    const limitParam = Math.min(Math.max(Number(url.searchParams.get('limit')) || 10, 1), 50);
    const typeFilter = url.searchParams.get('type') || null;

    // Check admin permissions via user metadata using role hierarchy
    const orgMemberships = (user as Record<string, unknown>)?.organizationMemberships;
    const isAdmin = Array.isArray(orgMemberships) && orgMemberships.some(
      (m: unknown) => {
        const mem = m as Record<string, unknown>;
        const role = String(mem?.role || '');
        return getRoleLevel(role) <= 4;
      }
    );

    // Build query based on role
    let query: string;
    let values: unknown[];

    if (isAdmin && (!typeFilter || typeFilter === 'admin_monthly')) {
      query = `
        SELECT id, organization_id, report_type, report_month, ai_summary, ai_insights, score, recommendations, data_sources, created_at
        FROM ai_periodic_reports
        WHERE organization_id = $1::uuid
          AND report_type = 'admin_monthly'
        ORDER BY report_month DESC
        LIMIT $2::int
      `;
      values = [organizationId, limitParam];
    } else {
      query = `
        SELECT id, organization_id, report_type, report_month, ai_summary, ai_insights, score, recommendations, data_sources, created_at
        FROM ai_periodic_reports
        WHERE organization_id = $1::uuid
          AND report_type = 'employee_monthly'
          AND target_user_id = $2::text
        ORDER BY report_month DESC
        LIMIT $3::int
      `;
      values = [organizationId, clerkUserId, limitParam];
    }

    const reports = await queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
      organizationId,
      reason: 'fetch_periodic_reports',
      query,
      values,
    });

    return apiSuccess({
      reports: Array.isArray(reports) ? reports : [],
      meta: {
        total: Array.isArray(reports) ? reports.length : 0,
        isAdmin: Boolean(isAdmin),
      },
    });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg = IS_PROD ? 'Internal server error' : (e.message || 'Error');
      return apiError(e, { status: e.status, message: safeMsg });
    }
    console.error('[ai-reports] Error:', e);
    return apiError(e, { message: 'Failed to fetch periodic reports' });
  }
}

export const GET = shabbatGuard(GETHandler);
