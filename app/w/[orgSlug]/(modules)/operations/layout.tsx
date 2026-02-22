import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';
import { ModuleLoadingScreen } from '@/components/shared/ModuleLoadingScreen';
import OperationsLayoutShell from './OperationsLayoutShell';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('operations');

export default async function OperationsModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'operations' }).catch(() => undefined);

  const def = getModuleDefinition('operations');

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
    '--os-sidebar-text': '#0F172A',
    '--os-sidebar-text-muted': '#475569',
    '--os-sidebar-item-hover': 'rgba(14,165,233,0.10)',
    '--os-sidebar-brand-hover': 'rgba(14,165,233,0.10)',
    '--os-sidebar-control-hover': 'rgba(14,165,233,0.08)',
    '--os-sidebar-focus': 'rgba(14,165,233,0.25)',
    '--os-sidebar-active-bg': 'transparent',
    '--os-sidebar-active-bg-image': 'linear-gradient(135deg, rgba(14,165,233,0.95), rgba(2,132,199,0.95))',
    '--os-sidebar-active-text': '#FFFFFF',
    '--os-sidebar-active-ring': 'rgba(14,165,233,0.18)',
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)] text-slate-900" dir="rtl">
      <Suspense fallback={<ModuleLoadingScreen moduleKey="operations" />}>
        <OperationsLayoutShell orgSlug={orgSlug}>
          {children}
        </OperationsLayoutShell>
      </Suspense>
    </div>
  );
}
