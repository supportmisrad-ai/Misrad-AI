"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

// Force dynamic rendering to prevent build-time Clerk errors
export const dynamic = 'force-dynamic';

export default function Page() {
  const searchParams = useSearchParams();

  const redirectUrl = useMemo(() => {
    const raw = searchParams.get('redirect_url') || searchParams.get('redirectUrl') || searchParams.get('redirect');
    if (!raw) return undefined;
    return raw;
  }, [searchParams]);

  return <SignUp redirectUrl={redirectUrl} afterSignUpUrl={redirectUrl} />;
}