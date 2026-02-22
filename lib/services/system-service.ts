import 'server-only';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';

export type SystemBootstrap = {
  initialCurrentUser: {
    id: string;
    profileId?: string;
    name: string;
    role: string;
    avatar: string;
    online: boolean;
    capacity: number;
    email: string;
    phone?: string;
    isSuperAdmin: boolean;
    tenantId: string;
  };
  initialOrganization: {
    name: string;
    logo: string;
    primaryColor: string;
    isShabbatProtected: boolean;
  };
};

export async function getSystemBootstrap(orgSlug: string): Promise<SystemBootstrap> {
  // Run workspace access and user resolution in parallel — they share React.cache internally
  const [workspace, initialCurrentUser] = await Promise.all([
    requireWorkspaceAccessByOrgSlug(orgSlug),
    resolveWorkspaceCurrentUserForUi(orgSlug),
  ]);
  const normalizedCurrentUser = {
    ...initialCurrentUser,
    ...(initialCurrentUser.phone != null ? { phone: initialCurrentUser.phone } : { phone: undefined }),
  };

  const ttlSeconds = 60 * 60;
  const [resolvedAvatar, resolvedLogo] = await Promise.all([
    normalizedCurrentUser.avatar
      ? resolveStorageUrlMaybeServiceRole(normalizedCurrentUser.avatar, ttlSeconds, { organizationId: workspace.id })
      : Promise.resolve(''),
    workspace.logo
      ? resolveStorageUrlMaybeServiceRole(workspace.logo, ttlSeconds, { organizationId: workspace.id })
      : Promise.resolve(''),
  ]);

  const resolvedCurrentUser = {
    ...normalizedCurrentUser,
    avatar: resolvedAvatar ?? '',
  };

  const initialOrganization = {
    name: workspace.name,
    logo: resolvedLogo ?? '',
    primaryColor: '#000000',
    isShabbatProtected: workspace.isShabbatProtected,
  };

  return { initialCurrentUser: resolvedCurrentUser, initialOrganization };
}
