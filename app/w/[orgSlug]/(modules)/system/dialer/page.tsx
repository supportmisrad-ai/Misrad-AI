import { getSystemCallHistory, getSystemLeadsPage } from '@/app/actions/system-leads';
import { getSystemPipelineStages } from '@/app/actions/system-pipeline-stages';
import SystemDialerClient from './SystemDialerClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemDialerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  type LeadsRes = Awaited<ReturnType<typeof getSystemLeadsPage>>;
  const [leadsRes, callHistory, initialStages] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 50 }).catch((): LeadsRes => ({
      success: false,
      error: 'שגיאה בטעינת לידים',
    })),
    getSystemCallHistory({ orgSlug, take: 200 }).catch(() => []),
    getSystemPipelineStages({ orgSlug }).catch(() => []),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];
  const initialNextCursor = leadsRes.success ? leadsRes.data.nextCursor : null;
  const initialHasMore = leadsRes.success ? leadsRes.data.hasMore : false;

  return (
    <SystemDialerClient
      orgSlug={orgSlug}
      initialLeads={initialLeads}
      initialNextCursor={initialNextCursor}
      initialHasMore={initialHasMore}
      callHistory={callHistory}
      initialStages={initialStages}
    />
  );
}
