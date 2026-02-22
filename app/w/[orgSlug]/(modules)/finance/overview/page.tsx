import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import { getFinanceOverviewData, type FinanceOverviewData } from '@/lib/services/finance-service';
import OverviewView from '@/components/finance/OverviewView';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function FinanceOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  // Run workspace access and permission check in parallel
  const [workspace, canViewFinancials] = await Promise.all([
    requireWorkspaceAccessByOrgSlug(orgSlug),
    hasPermission('view_financials'),
  ]);

  let initialFinanceOverview: FinanceOverviewData | null = null;
  if (canViewFinancials) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    initialFinanceOverview = await getFinanceOverviewData({
      organizationId: workspace.id,
      dateRange: {
        from: start.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
    });
  }

  return <OverviewView initialFinanceOverview={initialFinanceOverview} />;
}
