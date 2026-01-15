import NexusModuleClient from '../NexusModuleClient';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';

export const dynamic = 'force-dynamic';

export default async function NexusCatchAllPage({
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
    />
  );
}
