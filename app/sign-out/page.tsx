'use client';

import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function SignOutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    let cancelled = false;
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
