import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import {
  enforceModuleAccessOrRedirect,
  persistCurrentUserLastLocation,
} from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';
import { UnifiedLoadingShell } from '@/components/shared/UnifiedLoadingShell';
import FinanceLayoutShell from './FinanceLayoutShell';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('finance');

// Async component for access check - wrapped in Suspense
async function AccessCheck({ orgSlug, children }: { orgSlug: string; children: React.ReactNode }) {
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'finance' });
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'finance' }).catch(() => undefined);
  return <>{children}</>;
}

export default async function FinanceModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;

  const def = getModuleDefinition('finance');

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
      <Suspense fallback={<UnifiedLoadingShell moduleKey="finance" stage="shell" />}>
        <AccessCheck orgSlug={orgSlug}>
          <FinanceLayoutShell orgSlug={orgSlug}>
            {children}
          </FinanceLayoutShell>
        </AccessCheck>
      </Suspense>
    </div>
  );
}
