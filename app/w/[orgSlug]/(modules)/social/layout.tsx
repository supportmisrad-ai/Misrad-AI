import React from 'react';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import SocialShell from '@/components/social/SocialShell';
import Navigation from '@/components/social/Navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getSocialInitialDataCached, getSocialNavigationMenu } from '@/lib/services/social-service';

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
  const def = getModuleDefinition('social');

  const clerk = await currentUser();
  const initialSocialData = await getSocialInitialDataCached({
    orgSlug,
    clerkUserId: clerk?.id || null,
  });

  const initialNavigationMenu = await getSocialNavigationMenu();

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
        />
        <SocialShell initialSocialData={initialSocialData} initialNavigationMenu={initialNavigationMenu}>
          {children}
        </SocialShell>
      </div>
    </div>
  );
}
