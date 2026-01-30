import React from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { enforceModuleAccessOrRedirect, persistCurrentUserLastLocation } from '@/lib/server/workspace';
import { RouteVideoHelp } from '@/components/knowledge-base/RouteVideoHelp';
import { getSystemMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = getSystemMetadata('nexus');


export default async function NexusModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'nexus' });
  const persistPromise = persistCurrentUserLastLocation({ orgSlug, module: 'nexus' }).catch(() => undefined);
  await Promise.race([persistPromise, new Promise<void>((resolve) => setTimeout(resolve, 150))]);
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
      <RouteVideoHelp />
    </div>
  );
}
