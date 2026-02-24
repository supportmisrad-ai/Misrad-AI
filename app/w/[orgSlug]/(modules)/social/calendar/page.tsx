'use client';

import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';
import { SkeletonGrid } from '@/components/ui/skeletons';

const Calendar = nextDynamic(() => import('@/components/social/Calendar'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={6} columns={3} />
    </div>
  ),
  ssr: false,
});

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] p-6">
          <SkeletonGrid cards={6} columns={3} />
        </div>
      }
    >
      <Calendar />
    </Suspense>
  );
}
