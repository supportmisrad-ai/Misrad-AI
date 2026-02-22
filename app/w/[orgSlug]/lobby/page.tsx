import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { currentUser } from '@clerk/nextjs/server';
import LobbyClient from './LobbyClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls


export default async function LobbyPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  // Run user resolution and logo signing in parallel
  const [userResult, signedLogo] = await Promise.all([
    resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id)
      .catch(async (e: unknown) => {
        console.error('[LobbyPage] resolveWorkspaceCurrentUserForUiWithWorkspaceId failed:', e);
        const clerk = await currentUser().catch(() => null);
        const email = clerk?.primaryEmailAddress?.emailAddress ?? null;
        const name = clerk?.fullName ?? clerk?.username ?? (email ? email.split('@')[0] : null) ?? 'User';
        const publicMetadata = (clerk?.publicMetadata ?? {}) as Record<string, unknown>;
        const roleValue = publicMetadata.role;
        const isSuperAdmin = publicMetadata.isSuperAdmin === true;
        return {
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
      }),
    workspace.logo
      ? resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id })
      : Promise.resolve(''),
  ]);
  const user = userResult;

  return (
    <LobbyClient
      orgSlug={orgSlug}
      workspace={{ name: workspace.name, logoUrl: signedLogo || null }}
      user={{ name: user?.name || 'User', role: user?.role || null, avatarUrl: user?.avatar || null }}
      entitlements={workspace.entitlements ?? {}}
      kpis={null}
    />
  );
}
