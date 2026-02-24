import { getSystemLeadsPage } from '@/app/actions/system-leads';
import { getSystemPipelineStages } from '@/app/actions/system-pipeline-stages';
import SystemSalesPipelineClient from '../SystemSalesPipelineClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemSalesPipelinePage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  type LeadsRes = Awaited<ReturnType<typeof getSystemLeadsPage>>;
  const [leadsRes, initialStages] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 50 }).catch((): LeadsRes => ({
      success: false,
      error: 'שגיאה בטעינת לידים',
    })),
    getSystemPipelineStages({ orgSlug }).catch(() => []),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];
  const initialNextCursor = leadsRes.success ? leadsRes.data.nextCursor : null;
  const initialHasMore = leadsRes.success ? leadsRes.data.hasMore : false;

  return (
    <SystemSalesPipelineClient
      orgSlug={orgSlug}
      initialLeads={initialLeads}
      initialNextCursor={initialNextCursor}
      initialHasMore={initialHasMore}
      initialStages={initialStages}
    />
  );
}
