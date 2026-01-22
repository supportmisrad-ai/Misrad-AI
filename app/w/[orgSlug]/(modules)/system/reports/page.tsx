import { getSystemLeads } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
import { getSystemTasks } from '@/app/actions/system-reports';
import SystemReportsClient from './SystemReportsClient';

export const dynamic = 'force-dynamic';

export default async function SystemReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [initialLeads, campaignsRes, initialTasks] = await Promise.all([
    getSystemLeads(orgSlug),
    getCampaigns(undefined, orgSlug),
    getSystemTasks({ orgSlug, take: 200 }),
  ]);

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
