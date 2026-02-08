import React from 'react';
import type { Metadata } from 'next';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import {
  enforceModuleAccessOrRedirect,
  persistCurrentUserLastLocation,
} from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import OperationsShell from '@/components/operations/OperationsShell';
import { getSystemMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = getSystemMetadata('operations');

export default async function OperationsModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const workspace = await enforceModuleAccessOrRedirect({ orgSlug, module: 'operations' });
  const persistPromise = persistCurrentUserLastLocation({ orgSlug, module: 'operations' }).catch(() => undefined);
  await Promise.race([persistPromise, new Promise<void>((resolve) => setTimeout(resolve, 150))]);

  const user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);
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
      <OperationsShell
        orgSlug={orgSlug}
        workspace={{ name: workspace.name, logoUrl: workspace.logo || null }}
        user={{ name: user.name, role: user.role || null, avatarUrl: user.avatar || null }}
        entitlements={workspace.entitlements}
      >
        {children}
      </OperationsShell>
    </div>
  );
}
