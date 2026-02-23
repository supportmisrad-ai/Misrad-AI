import { getSystemLeadsPage } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
import { listNexusTasksByOrgSlug } from '@/app/actions/nexus';
import SystemAnalyticsClient from './SystemAnalyticsClient';

export default async function SystemAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const tabRaw = sp.tab;
  const initialTab = tabRaw === 'reports' ? 'reports' as const : 'analytics' as const;

  const [leadsRes, campaignsRes, initialTasks] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 50 }),
    getCampaigns(undefined, orgSlug),
    listNexusTasksByOrgSlug({ orgSlug, pageSize: 50 }).then((r) => r.tasks),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];

  const initialCampaigns = campaignsRes.success && Array.isArray(campaignsRes.data) ? campaignsRes.data : [];

  return <SystemAnalyticsClient initialLeads={initialLeads} initialCampaigns={initialCampaigns} initialTasks={initialTasks} initialTab={initialTab} />;
}
