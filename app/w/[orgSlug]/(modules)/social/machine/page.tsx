'use client';

import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';
import { SkeletonGrid } from '@/components/ui/skeletons';

const TheMachine = nextDynamic(() => import('@/components/social/TheMachine'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={4} columns={2} />
    </div>
  ),
  ssr: false,
});

export default function MachinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] p-6">
          <SkeletonGrid cards={4} columns={2} />
        </div>
      }
    >
      <div className="max-w-7xl mx-auto">
        <TheMachine />
      </div>
    </Suspense>
  );
}
