import NexusModuleClient from './NexusModuleClient';
import { currentUser } from '@clerk/nextjs/server';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { getNexusOwnerDashboardData } from '@/lib/services/nexus-service';

export const dynamic = 'force-dynamic';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getStringFromMetadata(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const obj = asObject(value);
  const role = obj?.role;
  return typeof role === 'string' ? role : null;
}

export default async function NexusModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const initialOwnerDashboard = await getNexusOwnerDashboardData(orgSlug);

  const clerk = await currentUser();
  const clerkObj = asObject(clerk) ?? {};
  const publicMd = asObject(clerkObj.publicMetadata);
  const privateMd = asObject(clerkObj.privateMetadata);
  const unsafeMd = asObject(clerkObj.unsafeMetadata);
  const roleFromClerk =
    getStringFromMetadata(publicMd?.role) ??
    getStringFromMetadata(privateMd?.role) ??
    getStringFromMetadata(unsafeMd?.role) ??
    null;
  const normalizedRole = roleFromClerk || 'עובד';
  const isSuperAdmin = Boolean(publicMd?.isSuperAdmin);

  const initialCurrentUser = {
    id: clerk?.id || '',
    name: clerk?.fullName ?? clerk?.username ?? '',
    role: normalizedRole || 'עובד',
    avatar: clerk?.imageUrl || '',
    online: true,
    capacity: 0,
    email: clerk?.primaryEmailAddress?.emailAddress || '',
    isSuperAdmin,
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
      initialOwnerDashboard={initialOwnerDashboard}
    />
  );
}
