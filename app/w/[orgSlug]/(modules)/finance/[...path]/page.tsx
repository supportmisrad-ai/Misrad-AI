import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import FinanceModuleEntryClient from '../FinanceModuleEntryClient';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';

export const dynamic = 'force-dynamic';

export default async function FinanceCatchAllPage({
  params,
}: {
  params: Promise<{ orgSlug: string; path: string[] }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const initialCurrentUser = await resolveWorkspaceCurrentUserForUi(orgSlug);

  const initialOrganization = {
    name: workspace.name,
    logo: workspace.logo || '',
    primaryColor: '#000000',
  };

  return (
    <FinanceModuleEntryClient
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialFinanceOverview={null}
    />
  );
}
