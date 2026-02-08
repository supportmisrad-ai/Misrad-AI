import { getSystemCallHistory, getSystemLeadsPage } from '@/app/actions/system-leads';
import { getSystemPipelineStages } from '@/app/actions/system-pipeline-stages';
import SystemDialerClient from './SystemDialerClient';

export const dynamic = 'force-dynamic';

export default async function SystemDialerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const [leadsRes, callHistory, initialStages] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 200 }),
    getSystemCallHistory({ orgSlug, take: 200 }),
    getSystemPipelineStages({ orgSlug }),
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
