import React from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import {
  enforceModuleAccessOrRedirect,
  persistCurrentUserLastLocation,
  requireWorkspaceAccessByOrgSlug,
} from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import FinanceModuleEntryClient from './FinanceModuleEntryClient';
import { getSystemMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

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
  await enforceModuleAccessOrRedirect({ orgSlug, module: 'finance' });
  const persistPromise = persistCurrentUserLastLocation({ orgSlug, module: 'finance' }).catch(() => undefined);
  await Promise.race([persistPromise, new Promise<void>((resolve) => setTimeout(resolve, 150))]);

  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const initialCurrentUser = await resolveWorkspaceCurrentUserForUi(orgSlug);
  const initialOrganization = {
    name: workspace.name,
    logo: workspace.logo || '',
    primaryColor: '#000000',
    isShabbatProtected: workspace.isShabbatProtected,
  };
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
      <FinanceModuleEntryClient initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
        {children}
      </FinanceModuleEntryClient>
    </div>
  );
}
