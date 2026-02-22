import React from 'react';
import { getSystemBootstrapCached } from '@/lib/services/system-service';
import SystemShellGateClient from './SystemShellGateClient';

/**
 * Async server component that fetches heavy System bootstrap data.
 * Rendered inside a Suspense boundary in the layout so the layout
 * itself returns instantly (theme wrapper + skeleton fallback).
 */
export default async function SystemLayoutShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  const bootstrap = await getSystemBootstrapCached(orgSlug);
  const { initialCurrentUser, initialOrganization } = bootstrap;

  return (
    <SystemShellGateClient
      orgSlug={orgSlug}
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
    >
      {children}
    </SystemShellGateClient>
  );
}
