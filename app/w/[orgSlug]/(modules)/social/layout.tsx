import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';
import { UnifiedLoadingShell } from '@/components/shared/UnifiedLoadingShell';
import SocialLayoutShell from './SocialLayoutShell';
import { WorkspaceSessionSaver } from '@/components/shared/WorkspaceSessionSaver';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('social');

import { getEntitlements } from '@/lib/entitlements';
import { ArchiveModeBanner } from '@/components/shared/ArchiveModeBanner';

// Async component for access check - wrapped in Suspense
async function AccessCheck({ orgSlug, children }: { orgSlug: string; children: React.ReactNode }) {
  const workspace = await enforceModuleAccessOrRedirect({ orgSlug, module: 'social' });
  
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'social' }).catch(() => undefined);

  const entitlements = getEntitlements(
    workspace.subscriptionStatus,
    workspace.subscriptionPlan,
    workspace.trialEndDate
  );

  return (
    <>
      <WorkspaceSessionSaver
        orgSlug={orgSlug}
        moduleKey="social"
        entitlements={workspace.entitlements as Record<string, boolean>}
      />
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

export default async function SocialModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

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
      {/* Immediate shell while access check runs */}
      <Suspense fallback={<UnifiedLoadingShell moduleKey="social" stage="shell" />}>
        <AccessCheck orgSlug={orgSlug}>
          <SocialLayoutShell orgSlug={orgSlug}>
            {children}
          </SocialLayoutShell>
        </AccessCheck>
      </Suspense>
    </div>
  );
}
