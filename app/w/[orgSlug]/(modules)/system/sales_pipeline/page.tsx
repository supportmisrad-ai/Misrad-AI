import { getSystemLeads } from '@/app/actions/system-leads';
import { getSystemPipelineStages } from '@/app/actions/system-pipeline-stages';
import SystemSalesPipelineClient from '../SystemSalesPipelineClient';

export const dynamic = 'force-dynamic';

export default async function SystemSalesPipelinePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [initialLeads, initialStages] = await Promise.all([
    getSystemLeads(orgSlug),
    getSystemPipelineStages({ orgSlug }),
  ]);

  return (
    <SystemSalesPipelineClient
      orgSlug={orgSlug}
      initialLeads={initialLeads}
      initialStages={initialStages}
    />
  );
}
