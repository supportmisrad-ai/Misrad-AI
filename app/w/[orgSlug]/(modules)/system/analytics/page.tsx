import { getSystemLeadsPage } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
import { listNexusTasksByOrgSlug } from '@/app/actions/nexus';
import SystemAnalyticsClient from './SystemAnalyticsClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemAnalyticsPage({
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

  return <SystemAnalyticsClient initialLeads={initialLeads} initialCampaigns={initialCampaigns} initialTasks={initialTasks} />;
}
