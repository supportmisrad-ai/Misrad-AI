import 'server-only';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';

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
    phone: string | null;
    isSuperAdmin: boolean;
    tenantId: string;
  };
  initialOrganization: {
    name: string;
    logo: string;
    primaryColor: string;
  };
};

export async function getSystemBootstrap(orgSlug: string): Promise<SystemBootstrap> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const initialCurrentUser = await resolveWorkspaceCurrentUserForUi(orgSlug);

  const initialOrganization = {
    name: workspace.name,
    logo: workspace.logo || '',
    primaryColor: '#000000',
  };

  return { initialCurrentUser, initialOrganization };
}
