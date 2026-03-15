'use client';

import React, { Suspense } from 'react';
import { UnifiedLoadingShell } from '@/components/shared/UnifiedLoadingShell';

import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import SocialShell from '@/components/social/SocialShell';
import { getSocialCriticalDataCached, getSocialDeferredDataCached, getSocialNavigationMenu } from '@/lib/services/social-service';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';

async function DeferredDataShell({ orgSlug, organizationId, children, initialCriticalData, workspace, initialCurrentUser, initialNavigationMenu, systemFlags }: { orgSlug: string; organizationId: string; children: React.ReactNode; initialCriticalData: any; workspace: any; initialCurrentUser: any; initialNavigationMenu: any; systemFlags: any }) {
  const deferredData = await getSocialDeferredDataCached({ orgSlug, organizationId });
  const signedLogo = workspace.logo ? await resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId }) : '';
  const initialOrganization = { name: workspace.name, logo: signedLogo || '', primaryColor: '#000000', isShabbatProtected: workspace.isShabbatProtected };
  const caps = computeWorkspaceCapabilities({ entitlements: workspace?.entitlements, fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance), seatsAllowedOverride: workspace?.seatsAllowed ?? null });
  const initialSocialData = { ...initialCriticalData, ...deferredData };
  return (
    <SocialShell orgSlug={orgSlug} isTeamEnabled={caps.isTeamManagementEnabled} initialSocialData={initialSocialData} initialNavigationMenu={initialNavigationMenu} initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
      {children}
    </SocialShell>
  );
}

async function CriticalDataLoader({ orgSlug, children }: { orgSlug: string; children: React.ReactNode }) {
  const [workspace, initialCurrentUser, initialCriticalData, initialNavigationMenu, systemFlags] = await Promise.all([
    requireWorkspaceAccessByOrgSlugUi(orgSlug),
    resolveWorkspaceCurrentUserForUi(orgSlug),
    getSocialCriticalDataCached({ orgSlug, clerkUserId: null }),
    getSocialNavigationMenu(),
    getSystemFeatureFlags(),
  ]);
  const organizationId = workspace.id;
  const fallbackCaps = computeWorkspaceCapabilities({ entitlements: workspace?.entitlements, fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance), seatsAllowedOverride: workspace?.seatsAllowed ?? null });
  return (
    <Suspense fallback={
      <SocialShell orgSlug={orgSlug} isTeamEnabled={fallbackCaps.isTeamManagementEnabled} initialSocialData={{...initialCriticalData, team: [], tasks: [], conversations: [], clientRequests: [], managerRequests: [], ideas: [], SquareActivity: []}} initialNavigationMenu={initialNavigationMenu} initialCurrentUser={initialCurrentUser} initialOrganization={{name: workspace.name, logo: '', primaryColor: '#000000', isShabbatProtected: workspace.isShabbatProtected}}>
        {children}
      </SocialShell>
    }>
      <DeferredDataShell orgSlug={orgSlug} organizationId={organizationId} initialCriticalData={initialCriticalData} workspace={workspace} initialCurrentUser={initialCurrentUser} initialNavigationMenu={initialNavigationMenu} systemFlags={systemFlags}>{children}</DeferredDataShell>
    </Suspense>
  );
}

export default function SocialLayoutShell({ orgSlug, children }: { orgSlug: string; children: React.ReactNode }) {
  return (
    <Suspense fallback={<UnifiedLoadingShell moduleKey="social" stage="shell" />}>
      <CriticalDataLoader orgSlug={orgSlug}>{children}</CriticalDataLoader>
    </Suspense>
  );
}
