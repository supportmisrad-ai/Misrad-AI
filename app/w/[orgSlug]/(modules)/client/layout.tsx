import React from 'react';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';

export const dynamic = 'force-dynamic';

export default async function ClientModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'client' });
  const persistPromise = persistCurrentUserLastLocation({ orgSlug, module: 'client' }).catch(() => undefined);
  await Promise.race([persistPromise, new Promise<void>((resolve) => setTimeout(resolve, 150))]);
  const def = getModuleDefinition('client');

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': '#F8FAFC',
    '--os-sidebar-active-bg': 'var(--os-accent)',
    '--os-sidebar-active-bg-image': 'linear-gradient(135deg, rgba(217,119,6,0.95), rgba(161,98,7,0.95))',
    '--os-sidebar-active-text': '#ffffff',
    '--os-sidebar-active-ring': 'rgba(217,119,6,0.25)',
    '--os-header-title': '#111827',
    '--os-header-mobile-text': '#111827',
    '--os-header-action-icon': '#4b5563',
  } as React.CSSProperties;

  return (
    <div
      style={style}
      data-module={def.key}
      className="min-h-screen bg-[#f1f5f9] text-slate-900"
      dir="rtl"
    >
      <div className="w-full">{children}</div>
    </div>
  );
}
