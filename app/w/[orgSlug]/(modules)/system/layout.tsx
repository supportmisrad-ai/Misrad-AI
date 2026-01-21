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
