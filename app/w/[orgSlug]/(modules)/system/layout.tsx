import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';
import { UnifiedLoadingShell } from '@/components/shared/UnifiedLoadingShell';
import SystemLayoutShell from './SystemLayoutShell';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('system');

import { getEntitlements } from '@/lib/entitlements';
import { ArchiveModeBanner } from '@/components/shared/ArchiveModeBanner';

// Async component for access check - wrapped in Suspense
async function AccessCheck({ orgSlug, children }: { orgSlug: string; children: React.ReactNode }) {
  const workspace = await enforceModuleAccessOrRedirect({ orgSlug, module: 'system' });
  
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'system' }).catch(() => undefined);

  const entitlements = getEntitlements(
    workspace.subscriptionStatus,
    workspace.subscriptionPlan,
    workspace.trialEndDate
  );

  return (
    <>
      {entitlements.banner && (
        <ArchiveModeBanner 
          message={entitlements.banner.message} 
          action={entitlements.banner.action} 
        />
      )}
      {children}
    </>
  );
}

export default async function SystemModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;

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
      {/* Immediate shell while access check runs */}
      <Suspense fallback={<UnifiedLoadingShell moduleKey="system" stage="shell" />}>
        <AccessCheck orgSlug={orgSlug}>
          <SystemLayoutShell orgSlug={orgSlug}>
            {children}
          </SystemLayoutShell>
        </AccessCheck>
      </Suspense>
    </div>
  );
}
