import { currentUser } from '@clerk/nextjs/server';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import { getFinanceOverviewData } from '@/lib/services/finance-service';
import FinanceModuleEntryClient from './FinanceModuleEntryClient';

export const dynamic = 'force-dynamic';

export default async function FinanceModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const clerk = await currentUser();
  const roleFromClerk =
    (clerk as any)?.publicMetadata?.role ??
    (clerk as any)?.privateMetadata?.role ??
    (clerk as any)?.unsafeMetadata?.role ??
    null;
  const normalizedRole = typeof roleFromClerk === 'string' ? roleFromClerk : (roleFromClerk as any)?.role ?? 'עובד';

  const initialCurrentUser = {
    id: clerk?.id || '',
    name: clerk?.fullName ?? clerk?.username ?? '',
    role: normalizedRole || 'עובד',
    avatar: clerk?.imageUrl || '',
    online: true,
    capacity: 0,
    email: clerk?.primaryEmailAddress?.emailAddress || '',
    isSuperAdmin: Boolean((clerk as any)?.publicMetadata?.isSuperAdmin),
    tenantId: workspace.id,
  };

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
