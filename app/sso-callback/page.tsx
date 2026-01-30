'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
