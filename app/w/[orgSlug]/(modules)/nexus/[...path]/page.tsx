import NexusModuleClient from '../NexusModuleClient';
import { currentUser } from '@clerk/nextjs/server';
import { getNexusDashboardBootstrapCached } from '@/lib/services/nexus-service';
import { asObject } from '@/lib/shared/unknown';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import type { ModuleId, OrganizationProfile } from '@/types';

export const dynamic = 'force-dynamic';

function getStringFromMetadata(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const obj = asObject(value);
  const role = obj?.role;
  return typeof role === 'string' ? role : null;
}

export default async function NexusCatchAllPage({
  params,
}: {
  params: Promise<{ orgSlug: string; path: string[] }> | { orgSlug: string; path: string[] };
}) {
  const { orgSlug } = await params;
  const bootstrap = await getNexusDashboardBootstrapCached({ orgSlug });
  const workspace = bootstrap.workspace;

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

  const optionalModule = (enabled: boolean | undefined, id: ModuleId): ModuleId[] => (enabled ? [id] : []);
  const enabledModules: ModuleId[] = [
    'crm',
    'ai',
    'team',
    ...(workspace.entitlements?.finance ? (['finance'] as ModuleId[]) : []),
    ...(workspace.entitlements?.operations ? (['operations'] as ModuleId[]) : []),
  ];

  const signedLogo = await resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id });

  const initialOrganization: Partial<OrganizationProfile> = {
    name: workspace.name,
    logo: signedLogo || '',
    primaryColor: '#000000',
    enabledModules,
    isShabbatProtected: workspace.isShabbatProtected,
  };

  return (
    <NexusModuleClient
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialOwnerDashboard={bootstrap.ownerDashboard}
      initialOnboardingTemplateKey={bootstrap.onboardingTemplateKey}
      initialBillingItems={bootstrap.billingItems}
    />
  );
}
