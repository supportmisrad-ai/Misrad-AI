'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { saveWorkspaceSession } from '@/lib/client/workspace-session';

type Props = {
  orgSlug: string;
  moduleKey: string;
  entitlements: Record<string, boolean>;
};

/**
 * WorkspaceSessionSaver
 *
 * Tiny client component inserted inside module AccessCheck (after successful auth).
 * Persists orgSlug + entitlements + lastModule to localStorage so that on the
 * next app open / login, LoginPageClient can navigate directly without /me round-trip.
 *
 * Zero visual output — pure side-effect.
 */
export function WorkspaceSessionSaver({ orgSlug, moduleKey, entitlements }: Props) {
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded || !userId) return;
    saveWorkspaceSession({
      userId,
      orgSlug,
      lastModule: moduleKey,
      entitlements,
    });
  }, [isLoaded, userId, orgSlug, moduleKey, entitlements]);

  return null;
}
