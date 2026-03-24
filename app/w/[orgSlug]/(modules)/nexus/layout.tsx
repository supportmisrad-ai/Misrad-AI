import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';
import { UnifiedLoadingShell } from '@/components/shared/UnifiedLoadingShell';
import NexusLayoutShell from './NexusLayoutShell';
import { WorkspaceSessionSaver } from '@/components/shared/WorkspaceSessionSaver';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('nexus');

// Async component for access check - wrapped in Suspense
async function AccessCheck({ orgSlug, children }: { orgSlug: string; children: React.ReactNode }) {
  const workspace = await enforceModuleAccessOrRedirect({ orgSlug, module: 'nexus' });
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'nexus' }).catch(() => undefined);
  return (
    <>
      <WorkspaceSessionSaver
        orgSlug={orgSlug}
        moduleKey="nexus"
        entitlements={workspace.entitlements as Record<string, boolean>}
      />
      {children}
    </>
  );
}

export default async function NexusModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const def = getModuleDefinition('nexus');

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
      {/* Immediate shell while access check runs */}
      <Suspense fallback={<UnifiedLoadingShell moduleKey="nexus" stage="shell" />}>
        <AccessCheck orgSlug={orgSlug}>
          <NexusLayoutShell orgSlug={orgSlug}>
            {children}
          </NexusLayoutShell>
        </AccessCheck>
      </Suspense>
    </div>
  );
}
