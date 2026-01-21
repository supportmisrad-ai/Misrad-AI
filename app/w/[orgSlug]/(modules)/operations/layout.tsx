import React from 'react';
import { redirect } from 'next/navigation';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import {
  persistCurrentUserLastLocation,
  requireWorkspaceAccessByOrgSlugUi,
} from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import OperationsShell from '@/components/operations/OperationsShell';

export const dynamic = 'force-dynamic';

export default async function OperationsModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  if (!workspace.entitlements.operations) {
    redirect(`/w/${encodeURIComponent(orgSlug)}/no-access?module=${encodeURIComponent('operations')}`);
  }

  persistCurrentUserLastLocation({ orgSlug, module: 'operations' }).catch(() => undefined);

  const user = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);
  const def = getModuleDefinition('operations');

  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
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
