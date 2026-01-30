import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import { getFinanceOverviewData } from '@/lib/services/finance-service';
import OverviewView from '@/components/finance/OverviewView';

export const dynamic = 'force-dynamic';

export default async function FinanceOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  let initialFinanceOverview: any = null;
  const canViewFinancials = await hasPermission('view_financials');
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
