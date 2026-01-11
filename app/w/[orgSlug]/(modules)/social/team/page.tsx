'use client';

import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';


const TeamView = nextDynamic(() => import('@/components/social/TeamView'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  ),
  ssr: false,
});

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <TeamView />
    </Suspense>
  );
}
