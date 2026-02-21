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
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { getSystemMetadata } from '@/lib/metadata';

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

  // Run all independent data fetches in parallel
  const [, workspace, initialCurrentUser] = await Promise.all([
    enforceModuleAccessOrRedirect({ orgSlug, module: 'finance' }),
    requireWorkspaceAccessByOrgSlug(orgSlug),
    resolveWorkspaceCurrentUserForUi(orgSlug),
  ]);
  // Fire-and-forget: don't block render for location tracking
  persistCurrentUserLastLocation({ orgSlug, module: 'finance' }).catch(() => undefined);

  const signedLogo = await resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id });
  const initialOrganization = {
    name: workspace.name,
    logo: signedLogo || '',
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
