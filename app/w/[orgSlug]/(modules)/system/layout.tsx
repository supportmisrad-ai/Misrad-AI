import React from 'react';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemBootstrap } from '@/lib/services/system-service';
import SystemShellGateClient from './SystemShellGateClient';

export const dynamic = 'force-dynamic';


export default async function SystemModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'system' });
  await persistCurrentUserLastLocation({ orgSlug, module: 'system' });
  const def = getModuleDefinition('system');
  const { initialCurrentUser, initialOrganization } = await getSystemBootstrap(orgSlug);

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
    '--os-sidebar-active-bg': '#A21D3C',
    '--os-sidebar-active-bg-image': 'linear-gradient(135deg, #A21D3C 0%, #3730A3 100%)',
    '--os-sidebar-active-shadow': 'rgba(162, 29, 60, 0.3)',
  } as React.CSSProperties;

  return (
    <div
      style={style}
      data-module={def.key}
      className="min-h-screen bg-[var(--os-bg)] text-slate-900"
      dir="rtl"
    >
      <SystemShellGateClient
        orgSlug={orgSlug}
        initialCurrentUser={initialCurrentUser}
        initialOrganization={initialOrganization}
      >
        {children}
      </SystemShellGateClient>
    </div>
  );
}
