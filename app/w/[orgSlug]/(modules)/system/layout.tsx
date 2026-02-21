import React from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemBootstrap } from '@/lib/services/system-service';
import SystemShellGateClient from './SystemShellGateClient';
import { getSystemMetadata } from '@/lib/metadata';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('system');


export default async function SystemModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  // Run module access check and bootstrap data fetch in parallel
  const [, bootstrap] = await Promise.all([
    enforceModuleAccessOrRedirect({ orgSlug, module: 'system' }),
    getSystemBootstrap(orgSlug),
  ]);
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'system' }).catch(() => undefined);
  const def = getModuleDefinition('system');
  const { initialCurrentUser, initialOrganization } = bootstrap;

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
    '--os-sidebar-active-bg': '#A21D3C',
    '--os-sidebar-active-bg-image': 'linear-gradient(135deg, #A21D3C 0%, #3730A3 100%)',
    '--os-sidebar-active-shadow': 'rgba(162, 29, 60, 0.10)',
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
