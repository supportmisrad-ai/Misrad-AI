'use client';

import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';
import { SkeletonGrid } from '@/components/ui/skeletons';

const Settings = nextDynamic(() => import('@/components/social/Settings'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={4} columns={2} />
    </div>
  ),
  ssr: false,
});

export default function SocialSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] p-6">
          <SkeletonGrid cards={4} columns={2} />
        </div>
      }
    >
      <Settings />
    </Suspense>
  );
}
