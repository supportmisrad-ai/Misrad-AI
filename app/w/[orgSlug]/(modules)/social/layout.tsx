import React from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation, requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import SocialShell from '@/components/social/SocialShell';
import { getSocialInitialDataCached, getSocialNavigationMenu } from '@/lib/services/social-service';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { getSystemMetadata } from '@/lib/metadata';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('social');

export default async function SocialModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  // Run ALL independent data fetches in parallel instead of sequentially
  const [, workspace, initialCurrentUser, initialSocialData, initialNavigationMenu, systemFlags] = await Promise.all([
    enforceModuleAccessOrRedirect({ orgSlug, module: 'social' }),
    requireWorkspaceAccessByOrgSlugUi(orgSlug),
    resolveWorkspaceCurrentUserForUi(orgSlug),
    getSocialInitialDataCached({ orgSlug, clerkUserId: null }),
    getSocialNavigationMenu(),
    getSystemFeatureFlags(),
  ]);

  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'social' }).catch(() => undefined);

  const def = getModuleDefinition('social');
  const signedLogo = await resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id });
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

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)]">
      <div className="min-h-screen bg-[var(--os-bg)]" suppressHydrationWarning>
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
      </div>
    </div>
  );
}
