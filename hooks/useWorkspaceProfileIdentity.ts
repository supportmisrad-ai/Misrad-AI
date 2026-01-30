'use client';

import { useEffect, useState } from 'react';
import { getMyProfile } from '@/app/actions/profiles';

export type WorkspaceProfileIdentity = {
  name: string | null;
  role: string | null;
  avatarUrl: string | null;
  profileCompleted: boolean;
};

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
        const p: any = res.data.profile;
        const rawCompleted = p?.ui_preferences?.profileCompleted;
        const profileCompleted = typeof rawCompleted === 'boolean' ? rawCompleted : true;
        setIdentity({
          name: p.full_name ? String(p.full_name) : null,
          role: p.role ? String(p.role) : null,
          avatarUrl: p.avatar_url ? String(p.avatar_url) : null,
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
