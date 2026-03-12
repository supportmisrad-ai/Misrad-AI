import { Suspense } from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { getClientsPage } from '@/app/actions/clients';
import { UnifiedLoadingShell } from '@/components/shared/UnifiedLoadingShell';
import ClientsPageClient from '@/components/social/clients/ClientsPageClient';

// Server Component for data fetching
async function ClientsData({ orgSlug }: { orgSlug: string }) {
  const res = await getClientsPage({
    orgSlug,
    cursor: null,
    pageSize: 60,
  });

  if (!res.success) {
    return <div className="p-6 text-rose-600">{res.error || 'שגיאה בטעינת לקוחות'}</div>;
  }

  return (
    <ClientsPageClient
      orgSlug={orgSlug}
      initialClients={res.data.clients}
      initialNextCursor={res.data.nextCursor}
      initialHasMore={res.data.hasMore}
    />
  );
}

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  await requireWorkspaceAccessByOrgSlug(orgSlug);

  return (
    <Suspense fallback={<UnifiedLoadingShell moduleKey="social" stage="content" />}>
      <ClientsData orgSlug={orgSlug} />
    </Suspense>
  );
}
