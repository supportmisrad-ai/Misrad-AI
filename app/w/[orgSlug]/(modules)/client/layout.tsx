import React from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { getSystemMetadata } from '@/lib/metadata';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('client');

export default async function ClientModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'client' });
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'client' }).catch(() => undefined);
  const def = getModuleDefinition('client');

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': '#F5F5F7',
    '--os-sidebar-active-bg': 'var(--os-accent)',
    '--os-sidebar-active-bg-image': 'linear-gradient(135deg, rgba(197,165,114,0.95), rgba(148,115,63,0.95))',
    '--os-sidebar-active-text': '#ffffff',
    '--os-sidebar-active-ring': 'rgba(197,165,114,0.25)',
    '--os-header-title': '#111827',
    '--os-header-mobile-text': '#111827',
    '--os-header-action-icon': '#4b5563',
  } as React.CSSProperties;

  return (
    <div
      style={style}
      data-module={def.key}
      className="min-h-screen bg-[color:var(--os-bg)] text-slate-900"
      dir="rtl"
    >
      <div className="w-full">{children}</div>
    </div>
  );
}
