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

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={finalSignInFallbackRedirectUrl}
      signUpFallbackRedirectUrl={finalSignUpFallbackRedirectUrl}
      routerPush={(to) => router.push(to)}
      routerReplace={(to) => router.replace(to)}
    >
      {children}
    </ClerkProvider>
  );
}
