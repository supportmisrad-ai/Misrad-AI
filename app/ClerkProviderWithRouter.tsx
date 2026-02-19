'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { heIL } from '@clerk/localizations';
import { useRouter } from 'next/navigation';

type ClerkProviderProps = React.ComponentProps<typeof ClerkProvider>;

type Props = {
  children: React.ReactNode;
  publishableKey?: ClerkProviderProps['publishableKey'];
  signInUrl?: ClerkProviderProps['signInUrl'];
  signUpUrl?: ClerkProviderProps['signUpUrl'];
  signInFallbackRedirectUrl?: string | null;
  signUpFallbackRedirectUrl?: string | null;
  proxyUrl?: ClerkProviderProps['proxyUrl'];
  domain?: ClerkProviderProps['domain'];
  isSatellite?: ClerkProviderProps['isSatellite'];
};

export function ClerkProviderWithRouter({
  children,
  publishableKey,
  signInUrl,
  signUpUrl,
  signInFallbackRedirectUrl,
  signUpFallbackRedirectUrl,
  proxyUrl,
  domain,
  isSatellite,
}: Props) {
  const router = useRouter();

  const isProd = process.env.NODE_ENV === 'production';

  const envProxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;
  const finalProxyUrl = proxyUrl ?? (isProd ? envProxyUrl : undefined);

  const useProxyUrl = finalProxyUrl !== undefined && finalProxyUrl !== '';
  const useDomain = domain !== undefined && isSatellite !== undefined;

  const finalSignInFallbackRedirectUrl = signInFallbackRedirectUrl;
  const finalSignUpFallbackRedirectUrl = signUpFallbackRedirectUrl;

  const finalSignInFallbackRedirectUrlOrUndefined =
    finalSignInFallbackRedirectUrl != null ? finalSignInFallbackRedirectUrl : undefined;
  const finalSignUpFallbackRedirectUrlOrUndefined =
    finalSignUpFallbackRedirectUrl != null ? finalSignUpFallbackRedirectUrl : undefined;

  if (useProxyUrl) {
    return (
      <ClerkProvider
        publishableKey={publishableKey}
        localization={heIL}
        signInUrl={signInUrl}
        signUpUrl={signUpUrl}
        signInFallbackRedirectUrl={finalSignInFallbackRedirectUrlOrUndefined}
        signUpFallbackRedirectUrl={finalSignUpFallbackRedirectUrlOrUndefined}
        routerPush={(to) => router.push(to)}
        routerReplace={(to) => router.replace(to)}
        proxyUrl={finalProxyUrl}
      >
        {children}
      </ClerkProvider>
    );
  }

  if (useDomain) {
    return (
      <ClerkProvider
        publishableKey={publishableKey}
        localization={heIL}
        signInUrl={signInUrl}
        signUpUrl={signUpUrl}
        signInFallbackRedirectUrl={finalSignInFallbackRedirectUrlOrUndefined}
        signUpFallbackRedirectUrl={finalSignUpFallbackRedirectUrlOrUndefined}
        routerPush={(to) => router.push(to)}
        routerReplace={(to) => router.replace(to)}
        domain={domain}
        isSatellite={isSatellite}
      >
        {children}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={heIL}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={finalSignInFallbackRedirectUrlOrUndefined}
      signUpFallbackRedirectUrl={finalSignUpFallbackRedirectUrlOrUndefined}
      routerPush={(to) => router.push(to)}
      routerReplace={(to) => router.replace(to)}
    >
      {children}
    </ClerkProvider>
  );
}
