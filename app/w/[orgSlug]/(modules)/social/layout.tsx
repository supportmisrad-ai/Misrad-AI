import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';
import { ModuleLoadingScreen } from '@/components/shared/ModuleLoadingScreen';
import SocialLayoutShell from './SocialLayoutShell';

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

  // Only the fast access check blocks the layout — everything else streams
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'social' });
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'social' }).catch(() => undefined);

  const def = getModuleDefinition('social');

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
    '--os-sidebar-active-bg': '#7C3AED',
    '--os-sidebar-active-bg-image': 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    '--os-sidebar-active-shadow': 'rgba(124, 58, 237, 0.15)',
    '--os-sidebar-section-label': '#7C3AED',
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)]" suppressHydrationWarning>
      <Suspense fallback={<ModuleLoadingScreen moduleKey="social" />}>
        <SocialLayoutShell orgSlug={orgSlug}>
          {children}
        </SocialLayoutShell>
      </Suspense>
    </div>
  );
}
