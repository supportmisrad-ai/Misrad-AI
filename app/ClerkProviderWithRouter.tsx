'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

type ClerkProviderProps = React.ComponentProps<typeof ClerkProvider>;

type Props = {
  children: React.ReactNode;
  publishableKey?: ClerkProviderProps['publishableKey'];
  signInUrl?: ClerkProviderProps['signInUrl'];
  signUpUrl?: ClerkProviderProps['signUpUrl'];
  signInFallbackRedirectUrl?: string | null;
  signUpFallbackRedirectUrl?: string | null;
};

export function ClerkProviderWithRouter({
  children,
  publishableKey,
  signInUrl,
  signUpUrl,
  signInFallbackRedirectUrl,
  signUpFallbackRedirectUrl,
}: Props) {
  const router = useRouter();

  const finalSignInFallbackRedirectUrl =
    signInFallbackRedirectUrl != null ? signInFallbackRedirectUrl : undefined;
  const finalSignUpFallbackRedirectUrl =
    signUpFallbackRedirectUrl != null ? signUpFallbackRedirectUrl : undefined;

  // CRITICAL: proxyUrl must match middleware.ts config to prevent auth loops
  // When using a custom domain (e.g., clerk.misrad-ai.com), sessions created via
  // the proxy will not be recognized server-side without this setting
  const proxyUrl = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_CLERK_PROXY_URL || undefined
    : undefined;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={finalSignInFallbackRedirectUrl}
      signUpFallbackRedirectUrl={finalSignUpFallbackRedirectUrl}
      proxyUrl={proxyUrl}
      routerPush={(to) => router.push(to)}
      routerReplace={(to) => router.replace(to)}
    >
      {children}
    </ClerkProvider>
  );
}
