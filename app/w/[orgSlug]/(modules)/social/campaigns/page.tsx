'use client';

import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';
import { SkeletonGrid } from '@/components/ui/skeletons';

export const dynamic = 'force-dynamic';


const Campaigns = nextDynamic(() => import('@/components/social/Campaigns'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={6} columns={3} />
    </div>
  ),
  ssr: false,
});

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] p-6">
          <SkeletonGrid cards={6} columns={3} />
        </div>
      }
    >
      <Campaigns />
    </Suspense>
  );
}
