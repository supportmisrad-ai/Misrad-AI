import { getSystemLeadsPage } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
import { listNexusTasksByOrgSlug } from '@/app/actions/nexus';
import SystemReportsClient from './SystemReportsClient';

export const dynamic = 'force-dynamic';

export default async function SystemReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const [leadsRes, campaignsRes, initialTasks] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 200 }),
    getCampaigns(undefined, orgSlug),
    listNexusTasksByOrgSlug({ orgSlug, pageSize: 200 }).then((r) => r.tasks),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];

  const initialCampaigns = campaignsRes.success && Array.isArray(campaignsRes.data) ? campaignsRes.data : [];

  return (
    <SystemReportsClient
      orgSlug={orgSlug}
      initialLeads={initialLeads}
      initialCampaigns={initialCampaigns}
      initialTasks={initialTasks}
    />
  );
}
