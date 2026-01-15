'use client';

import { Suspense } from 'react';
import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const GlobalProfileHub = nextDynamic(() => import('@/components/profile/GlobalProfileHub'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  ),
});

export default function SocialHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <GlobalProfileHub defaultOrigin="social" defaultDrawer="social" />
    </Suspense>
  );
}
