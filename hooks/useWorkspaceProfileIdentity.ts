'use client';

import { useEffect, useState } from 'react';
import { getMyProfile } from '@/app/actions/profiles';

export type WorkspaceProfileIdentity = {
  name: string | null;
  role: string | null;
  avatarUrl: string | null;
  profileCompleted: boolean;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  const v = obj?.[key];
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

export function useWorkspaceProfileIdentity(orgSlug: string | null | undefined): {
  identity: WorkspaceProfileIdentity | null;
  isLoading: boolean;
} {
  const [identity, setIdentity] = useState<WorkspaceProfileIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!orgSlug) {
        if (mounted) setIdentity(null);
        return;
      }

      setIsLoading(true);
      try {
        const res = await getMyProfile({ orgSlug });
        if (!mounted) return;
        if (!res.success || !res.data?.profile) return;
        const p = asObject(res.data.profile);
        const uiPrefs = asObject(p?.ui_preferences);
        const rawCompleted = uiPrefs?.profileCompleted;
        const profileCompleted = typeof rawCompleted === 'boolean' ? rawCompleted : true;
        setIdentity({
          name: getStringProp(p, 'full_name'),
          role: getStringProp(p, 'role'),
          avatarUrl: getStringProp(p, 'avatar_url'),
          profileCompleted,
        });
      } catch {
        // Best-effort
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [orgSlug]);

  return { identity, isLoading };
}
