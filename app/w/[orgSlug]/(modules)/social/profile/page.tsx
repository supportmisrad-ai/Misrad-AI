'use client';

import { Suspense } from 'react';
import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';


const SocialAccountPage = nextDynamic(() => import('@/components/social/SocialAccountPage'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  ),
  ssr: false,
});

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <SocialAccountPage />
    </Suspense>
  );
}
