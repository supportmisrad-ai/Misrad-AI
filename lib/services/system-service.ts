import 'server-only';
import { currentUser } from '@clerk/nextjs/server';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export type SystemBootstrap = {
  initialCurrentUser: {
    id: string;
    name: string;
    role: string;
    avatar: string;
    online: boolean;
    capacity: number;
    email: string;
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

  return { initialCurrentUser, initialOrganization };
}
