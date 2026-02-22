import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import FinanceModuleClient from './FinanceModuleClient';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';

/**
 * Async server component that fetches heavy Finance data.
 * Rendered inside a Suspense boundary in the layout so the layout
 * itself returns instantly (theme wrapper + skeleton fallback).
 */
export default async function FinanceLayoutShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  // Run all independent data fetches in parallel
  const [workspace, initialCurrentUser] = await Promise.all([
    requireWorkspaceAccessByOrgSlug(orgSlug),
    resolveWorkspaceCurrentUserForUi(orgSlug),
  ]);

  const signedLogo = workspace.logo
    ? await resolveStorageUrlMaybeServiceRole(workspace.logo, 60 * 60, { organizationId: workspace.id })
    : '';
  const initialOrganization = {
    name: workspace.name,
    logo: signedLogo || '',
    primaryColor: '#000000',
    isShabbatProtected: workspace.isShabbatProtected,
  };

  return (
    <FinanceModuleClient initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
      {children}
    </FinanceModuleClient>
  );
}
