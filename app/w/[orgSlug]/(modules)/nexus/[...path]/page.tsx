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

  // Parallelize initial data fetching
  const [bootstrap, clerk] = await Promise.all([
    getNexusDashboardBootstrapCached({ orgSlug }),
    currentUser(),
  ]);

  const workspace = bootstrap.workspace;
  const signedLogo = await resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id });

  const clerkObj = asObject(clerk) ?? {};

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
