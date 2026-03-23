import React, { Suspense } from 'react';
import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import ClientMeShell from './ClientMeShell';
import { DashboardContentSkeleton } from '@/components/shared/ModuleLoadingScreen';

// Async component wrapped in Suspense so parent layout returns instantly
async function ClientMeShellLoader({ orgSlug, children }: { orgSlug: string; children: React.ReactNode }) {
  // Both calls are React.cache-wrapped — zero cost if page.tsx triggers them too
  const [workspace, user] = await Promise.all([
    requireWorkspaceAccessByOrgSlugUi(orgSlug),
    resolveWorkspaceCurrentUserForUi(orgSlug),
  ]);

  // Pass raw logo ref — the <img> onError triggers fallback icon automatically.
  // The signed URL is only needed in MeView (handled by page.tsx).
  const logoUrl = typeof workspace.logo === 'string' && workspace.logo.startsWith('http')
    ? workspace.logo
    : null;

  return (
    <ClientMeShell
      orgSlug={orgSlug}
      initialCurrentUser={{
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      }}
      workspaceLogo={logoUrl}
      workspaceName={workspace.name}
    >
      {children}
    </ClientMeShell>
  );
}

export default async function ClientMeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return (
    <Suspense fallback={<div className="p-4 md:p-6"><DashboardContentSkeleton moduleKey="client" /></div>}>
      <ClientMeShellLoader orgSlug={orgSlug}>
        {children}
      </ClientMeShellLoader>
    </Suspense>
  );
}
