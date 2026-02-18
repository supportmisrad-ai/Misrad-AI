'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SsoCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl="/me"
      signUpForceRedirectUrl="/me"
      signInUrl="/login"
      signUpUrl="/login?mode=sign-up"
    />
  );
}
