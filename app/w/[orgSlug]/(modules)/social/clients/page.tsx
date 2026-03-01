'use client';

import nextDynamic from 'next/dynamic';
import { use } from 'react';
import { SkeletonGrid } from '@/components/ui/skeletons';

const ClientsPageClient = nextDynamic(() => import('@/components/social/clients/ClientsPageClient'), {
  loading: () => (
    <div className="min-h-[400px] p-6">
      <SkeletonGrid cards={6} columns={3} />
    </div>
  ),
  ssr: false,
});

export default function ClientsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  return (
    <ClientsPageClient orgSlug={resolvedParams.orgSlug} />
  );
}
