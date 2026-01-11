"use client";

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useEffect } from 'react';

// Force dynamic rendering to prevent build-time Clerk errors
export const dynamic = 'force-dynamic';

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const redirectUrl = useMemo(() => {
    const raw = searchParams.get('redirect_url') || searchParams.get('redirectUrl') || searchParams.get('redirect');
    if (!raw) return undefined;
    return raw;
  }, [searchParams]);

  useEffect(() => {
    const destination = redirectUrl
      ? `/login?redirect=${encodeURIComponent(String(redirectUrl))}`
      : '/login';
    router.replace(destination);
  }, [router, redirectUrl]);

  return null;
}