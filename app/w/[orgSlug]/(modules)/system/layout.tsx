import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';
import { ModuleLoadingScreen } from '@/components/shared/ModuleLoadingScreen';
import SystemLayoutShell from './SystemLayoutShell';

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

  // Only the fast access check blocks the layout — everything else streams
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'system' });
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'system' }).catch(() => undefined);
  const def = getModuleDefinition('system');

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
      <Suspense fallback={<ModuleLoadingScreen moduleKey="system" />}>
        <SystemLayoutShell orgSlug={orgSlug}>
          {children}
        </SystemLayoutShell>
      </Suspense>
    </div>
  );
}
