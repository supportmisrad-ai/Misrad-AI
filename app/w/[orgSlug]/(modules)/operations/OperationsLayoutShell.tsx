import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import OperationsShell from '@/components/operations/OperationsShell';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';

/**
 * Async server component that fetches heavy Operations data.
 * Rendered inside a Suspense boundary in the layout so the layout
 * itself returns instantly (theme wrapper + skeleton fallback).
 */
export default async function OperationsLayoutShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  // Use the cached workspace access (parent layout already verified via workspace layout)
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  // Run user resolution and logo signing in parallel (both need workspace.id)
  const [user, signedLogo] = await Promise.all([
    resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id),
    workspace.logo
      ? resolveStorageUrlMaybeServiceRole(workspace.logo, 3600, { organizationId: workspace.id })
      : Promise.resolve(''),
  ]);

  return (
    <OperationsShell
      orgSlug={orgSlug}
      workspace={{ name: workspace.name, logoUrl: signedLogo || null }}
      user={{ name: user.name, role: user.role || null, avatarUrl: user.avatar || null }}
      entitlements={workspace.entitlements}
    >
      {children}
    </OperationsShell>
  );
}
