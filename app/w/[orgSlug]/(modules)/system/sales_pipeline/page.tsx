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

  const [leadsRes, initialStages] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 50 }),
    getSystemPipelineStages({ orgSlug }),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];
  const initialNextCursor = leadsRes.success ? leadsRes.data.nextCursor : null;
  const initialHasMore = leadsRes.success ? leadsRes.data.hasMore : false;
  const userRole = leadsRes.success ? leadsRes.data.userRole : 'agent';
  const currentUserId = leadsRes.success ? leadsRes.data.currentUserId : null;

  return (
    <SystemSalesPipelineClient
      orgSlug={orgSlug}
      initialLeads={initialLeads}
      initialNextCursor={initialNextCursor}
      initialHasMore={initialHasMore}
      initialStages={initialStages}
      userRole={userRole}
      currentUserId={currentUserId}
    />
  );
}
