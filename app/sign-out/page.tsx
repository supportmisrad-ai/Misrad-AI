'use client';

import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';
import { clearWorkspaceSession } from '@/lib/client/workspace-session';

export default function SignOutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    let cancelled = false;
    clearWorkspaceSession();
    (async () => {
      try {
        await signOut({ redirectUrl: '/login' });
      } catch {
        if (cancelled) return;
        window.location.href = '/login';
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signOut]);

  return <div className="p-6 text-sm text-slate-600">מתנתק...</div>;
}
