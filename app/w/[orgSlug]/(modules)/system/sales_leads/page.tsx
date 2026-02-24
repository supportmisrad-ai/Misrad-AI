import { getSystemLeadsPage } from '@/app/actions/system-leads';
import SystemSalesLeadsClient from './SystemSalesLeadsClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemSalesLeadsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  type LeadsRes = Awaited<ReturnType<typeof getSystemLeadsPage>>;
  const res = await getSystemLeadsPage({ orgSlug, pageSize: 50 }).catch((): LeadsRes => ({
    success: false,
    error: 'שגיאה בטעינת לידים',
  }));
  const initialLeads = res.success ? res.data.leads : [];
  const initialNextCursor = res.success ? res.data.nextCursor : null;
  const initialHasMore = res.success ? res.data.hasMore : false;

  return (
    <SystemSalesLeadsClient
      orgSlug={orgSlug}
      initialLeads={initialLeads}
      initialNextCursor={initialNextCursor}
      initialHasMore={initialHasMore}
    />
  );
}
