import React from 'react';
import { getNexusDashboardBootstrapCached } from '@/lib/services/nexus-service';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import type { ModuleId, OrganizationProfile } from '@/types';
import NexusModuleClient from './NexusModuleClient';

/**
 * Async server component that fetches heavy Nexus bootstrap data.
 * Rendered inside a Suspense boundary in the layout so the layout
 * itself returns instantly (theme wrapper + skeleton fallback).
 *
 * NexusWorkspaceApp does its own client-side routing via usePathname(),
 * so {children} (the Next.js page segment) is rendered but will be null.
 */
export default async function NexusLayoutShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  // Phase 1: Run ALL independent I/O in a single parallel batch
  const [bootstrap, resolvedUser] = await Promise.all([
    getNexusDashboardBootstrapCached({ orgSlug }),
    resolveWorkspaceCurrentUserForUi(orgSlug),
  ]);

  const workspace = bootstrap.workspace;

  // Phase 2: Logo signing (depends on workspace from Phase 1)
  const signedLogo = workspace.logo
    ? await resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id })
    : '';

  const initialCurrentUser = {
    ...resolvedUser,
    ...(resolvedUser.phone != null ? { phone: resolvedUser.phone } : { phone: undefined }),
  };

  const enabledModules: ModuleId[] = [
    'crm',
    'ai',
    'team',
    ...(workspace.entitlements?.finance ? (['finance'] as ModuleId[]) : []),
    ...(workspace.entitlements?.operations ? (['operations'] as ModuleId[]) : []),
  ];

  const initialOrganization: Partial<OrganizationProfile> = {
    name: workspace.name,
    logo: signedLogo ?? '',
    primaryColor: '#000000',
    enabledModules,
    isShabbatProtected: workspace.isShabbatProtected,
  };

  return (
    <>
      <NexusModuleClient
        initialCurrentUser={initialCurrentUser}
        initialOrganization={initialOrganization}
        initialOwnerDashboard={bootstrap.ownerDashboard}
        initialOnboardingTemplateKey={bootstrap.onboardingTemplateKey}
        initialBillingItems={bootstrap.billingItems}
      />
      {children}
    </>
  );
}
