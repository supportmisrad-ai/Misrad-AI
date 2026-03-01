import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import {
  enforceModuleAccessOrRedirect,
  persistCurrentUserLastLocation,
} from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';
import { DashboardContentSkeleton } from '@/components/shared/ModuleLoadingScreen';
import FinanceLayoutShell from './FinanceLayoutShell';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('finance');

export default async function FinanceModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;

  // Only the fast access check blocks the layout — everything else streams
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'finance' });
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'finance' }).catch(() => undefined);

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
      <Suspense fallback={<div className="p-4 md:p-6"><DashboardContentSkeleton moduleKey="finance" /></div>}>
        <FinanceLayoutShell orgSlug={orgSlug}>
          {children}
        </FinanceLayoutShell>
      </Suspense>
    </div>
  );
}
