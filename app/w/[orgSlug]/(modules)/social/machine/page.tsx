'use client';

import nextDynamic from 'next/dynamic';
import { SkeletonGrid } from '@/components/ui/skeletons';

const TheMachine = nextDynamic(() => import('@/components/social/TheMachine'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={6} columns={3} />
    </div>
  ),
  ssr: false,
});

export default function TheMachinePage() {
  return <TheMachine />;
}
