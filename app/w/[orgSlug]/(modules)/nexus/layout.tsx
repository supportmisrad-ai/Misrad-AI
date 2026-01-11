import React from 'react';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';

export const dynamic = 'force-dynamic';


export default async function NexusModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'nexus' });
  await persistCurrentUserLastLocation({ orgSlug, module: 'nexus' });
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
      {children}
    </div>
  );
}
