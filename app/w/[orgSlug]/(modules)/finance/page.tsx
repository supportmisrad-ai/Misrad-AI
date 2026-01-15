import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import { getFinanceOverviewData } from '@/lib/services/finance-service';
import FinanceModuleEntryClient from './FinanceModuleEntryClient';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';

export const dynamic = 'force-dynamic';

export default async function FinanceModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const initialCurrentUser = await resolveWorkspaceCurrentUserForUi(orgSlug);

  const initialOrganization = {
    name: workspace.name,
    logo: workspace.logo || '',
    primaryColor: '#000000',
  };

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

  return (
    <FinanceModuleEntryClient
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialFinanceOverview={initialFinanceOverview}
    />
  );
}
