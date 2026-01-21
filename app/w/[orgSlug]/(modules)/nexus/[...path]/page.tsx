import NexusModuleClient from '../NexusModuleClient';
import { currentUser } from '@clerk/nextjs/server';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export const dynamic = 'force-dynamic';

export default async function NexusCatchAllPage({
  params,
}: {
  params: Promise<{ orgSlug: string; path: string[] }>;
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
    enabledModules: [
      'crm',
      'ai',
      'team',
      ...(workspace.entitlements?.finance ? (['finance'] as const) : []),
      ...(workspace.entitlements?.operations ? (['operations'] as const) : []),
    ],
  };

  return (
    <NexusModuleClient
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
    />
  );
}
