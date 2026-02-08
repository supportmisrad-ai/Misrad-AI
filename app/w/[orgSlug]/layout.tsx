import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import WorkspaceCanonicalRedirect from './WorkspaceCanonicalRedirect';

export const dynamic = 'force-dynamic';

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}


export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const decodedOrgSlug = safeDecodeURIComponent(orgSlug);
  const workspace = await requireWorkspaceAccessByOrgSlug(decodedOrgSlug);

  return (
    <div
      data-workspace-id={workspace.id}
      data-workspace-slug={decodedOrgSlug}
      className="min-h-screen"
    >
      <WorkspaceCanonicalRedirect currentOrgSlug={decodedOrgSlug} canonicalSlug={workspace.slug ?? null} />
      {children}
    </div>
  );
}
