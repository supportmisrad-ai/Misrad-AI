import { getSystemCallHistory, getSystemLeads } from '@/app/actions/system-leads';
import { getSystemPipelineStages } from '@/app/actions/system-pipeline-stages';
import SystemDialerClient from './SystemDialerClient';

export const dynamic = 'force-dynamic';

export default async function SystemDialerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [initialLeads, callHistory, initialStages] = await Promise.all([
    getSystemLeads(orgSlug),
    getSystemCallHistory({ orgSlug, take: 200 }),
    getSystemPipelineStages({ orgSlug }),
  ]);

  return <SystemDialerClient orgSlug={orgSlug} initialLeads={initialLeads} callHistory={callHistory} initialStages={initialStages} />;
}
