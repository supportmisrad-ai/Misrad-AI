'use client';

import nextDynamic from 'next/dynamic';
import { SkeletonGrid } from '@/components/ui/skeletons';

const Analytics = nextDynamic(() => import('@/components/social/Analytics'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={6} columns={3} />
    </div>
  ),
  ssr: false,
});

export default function AnalyticsPage() {
  return <Analytics />;
}
