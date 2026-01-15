import React from 'react';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation, requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import SocialShell from '@/components/social/SocialShell';
import Navigation from '@/components/social/Navigation';
import { getSocialInitialDataCached, getSocialNavigationMenu } from '@/lib/services/social-service';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';

export const dynamic = 'force-dynamic';


export default async function SocialModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'social' });
  await persistCurrentUserLastLocation({ orgSlug, module: 'social' });
  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  const def = getModuleDefinition('social');
  const initialCurrentUser = await resolveWorkspaceCurrentUserForUi(orgSlug);
  const initialOrganization = {
    name: workspace.name,
    logo: workspace.logo || '',
    primaryColor: '#000000',
  };
  const initialSocialData = await getSocialInitialDataCached({
    orgSlug,
    clerkUserId: null,
  });

  const initialNavigationMenu = await getSocialNavigationMenu();

  const systemFlags = await getSystemFeatureFlags();
  const caps = computeWorkspaceCapabilities({
    entitlements: workspace?.entitlements,
    fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance),
  });

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)]">
      <div className="min-h-screen bg-slate-50 flex" suppressHydrationWarning>
        <Navigation
          initialMenuItems={initialNavigationMenu}
          basePath={`/w/${orgSlug}/social`}
          isSidebarOpen={true}
          roomNameHebrew={'סושיאל OS'}
          gradient={null}
          isTeamEnabled={caps.isTeamManagementEnabled}
        />
        <SocialShell
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
