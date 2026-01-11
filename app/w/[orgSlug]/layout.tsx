import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import WorkspaceCanonicalRedirect from './WorkspaceCanonicalRedirect';

export const dynamic = 'force-dynamic';


export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  return (
    <div
      data-workspace-id={workspace.id}
      data-workspace-slug={orgSlug}
      className="min-h-screen"
    >
      <WorkspaceCanonicalRedirect currentOrgSlug={orgSlug} canonicalSlug={(workspace as any).slug ?? null} />
      {children}
    </div>
  );
}
