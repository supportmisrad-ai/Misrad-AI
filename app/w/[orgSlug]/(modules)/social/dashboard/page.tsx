'use client';

import nextDynamic from 'next/dynamic';
import { use } from 'react';
import { SkeletonGrid } from '@/components/ui/skeletons';

const Dashboard = nextDynamic(() => import('@/components/social/Dashboard'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={6} columns={3} />
    </div>
  ),
  ssr: false,
});

export default function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  return (
    <Dashboard orgSlug={resolvedParams.orgSlug} />
  );
}
