import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import { currentUser } from '@clerk/nextjs/server';
import LobbyClient from './LobbyClient';

export const dynamic = 'force-dynamic';


export default async function LobbyPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  let user: Awaited<ReturnType<typeof resolveWorkspaceCurrentUserForUiWithWorkspaceId>> | null = null;
  try {
    user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);
  } catch (e: unknown) {
    console.error('[LobbyPage] resolveWorkspaceCurrentUserForUiWithWorkspaceId failed:', e);
    const clerk = await currentUser().catch(() => null);
    const email = clerk?.primaryEmailAddress?.emailAddress ?? null;
    const name = clerk?.fullName ?? clerk?.username ?? (email ? email.split('@')[0] : null) ?? 'User';
    const publicMetadata = (clerk?.publicMetadata ?? {}) as Record<string, unknown>;
    const roleValue = publicMetadata.role;
    const isSuperAdmin = publicMetadata.isSuperAdmin === true;
    user = {
      id: clerk?.id ?? '',
      profileId: '',
      name,
      role: isSuperAdmin ? 'super_admin' : (typeof roleValue === 'string' ? roleValue : 'עובד'),
      avatar: clerk?.imageUrl ?? '',
      online: true,
      capacity: 0,
      email: email ?? '',
      phone: undefined,
      isSuperAdmin,
      organizationId: workspace.id,
      tenantId: workspace.id,
    };
  }

  return (
    <LobbyClient
      orgSlug={orgSlug}
      workspace={{ name: workspace.name, logoUrl: workspace.logo || null }}
      user={{ name: user?.name || 'User', role: user?.role || null, avatarUrl: user?.avatar || null }}
      entitlements={workspace.entitlements ?? {}}
      kpis={null}
    />
  );
}
