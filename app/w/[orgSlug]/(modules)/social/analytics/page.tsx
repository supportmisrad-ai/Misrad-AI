'use client';

import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';
import { SkeletonGrid } from '@/components/ui/skeletons';

const Analytics = nextDynamic(() => import('@/components/social/Analytics'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={4} columns={2} />
    </div>
  ),
  ssr: false,
});

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] p-6">
          <SkeletonGrid cards={4} columns={2} />
        </div>
      }
    >
      <Analytics />
    </Suspense>
  );
}
