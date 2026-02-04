import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import LobbyClient from './LobbyClient';

export const dynamic = 'force-dynamic';


export default async function LobbyPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  const user = await resolveWorkspaceCurrentUserForUi(orgSlug);

  return (
    <LobbyClient
      orgSlug={orgSlug}
      workspace={{ name: workspace.name, logoUrl: workspace.logo || null }}
      user={{ name: user.name, role: user.role || null, avatarUrl: user.avatar || null }}
      entitlements={workspace.entitlements}
      kpis={null}
    />
  );
}
