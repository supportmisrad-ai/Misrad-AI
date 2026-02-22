import React from 'react';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import SocialShell from '@/components/social/SocialShell';
import { getSocialInitialDataCached, getSocialNavigationMenu } from '@/lib/services/social-service';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';

/**
 * Async server component that fetches all heavy Social data.
 * Rendered inside a Suspense boundary in the layout so the layout
 * itself returns instantly (theme wrapper + skeleton fallback).
 */
export default async function SocialLayoutShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  // Run ALL independent data fetches in parallel
  const [workspace, initialCurrentUser, initialSocialData, initialNavigationMenu, systemFlags] = await Promise.all([
    requireWorkspaceAccessByOrgSlugUi(orgSlug),
    resolveWorkspaceCurrentUserForUi(orgSlug),
    getSocialInitialDataCached({ orgSlug, clerkUserId: null }),
    getSocialNavigationMenu(),
    getSystemFeatureFlags(),
  ]);

  const signedLogo = workspace.logo
    ? await resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id })
    : '';
  const initialOrganization = {
    name: workspace.name,
    logo: signedLogo || '',
    primaryColor: '#000000',
    isShabbatProtected: workspace.isShabbatProtected,
  };

  const caps = computeWorkspaceCapabilities({
    entitlements: workspace?.entitlements,
    fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance),
    seatsAllowedOverride: workspace?.seatsAllowed ?? null,
  });

  return (
    <SocialShell
      orgSlug={orgSlug}
      isTeamEnabled={caps.isTeamManagementEnabled}
      initialSocialData={initialSocialData}
      initialNavigationMenu={initialNavigationMenu}
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
    >
      {children}
    </SocialShell>
  );
}
