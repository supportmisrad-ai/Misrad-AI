import NexusModuleClient from './NexusModuleClient';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { getNexusOwnerDashboardData } from '@/lib/services/nexus-service';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';

export const dynamic = 'force-dynamic';


export default async function NexusModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const initialOwnerDashboard = await getNexusOwnerDashboardData(orgSlug);

  const initialCurrentUser = await resolveWorkspaceCurrentUserForUi(orgSlug);

  const initialOrganization = {
    name: workspace.name,
    logo: workspace.logo || '',
    primaryColor: '#000000',
    enabledModules: [
      'crm',
      'ai',
      'team',
      ...(workspace.entitlements?.finance ? (['finance'] as const) : []),
    ],
  };

  return (
    <NexusModuleClient
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialOwnerDashboard={initialOwnerDashboard}
    />
  );
}
