import { getSystemLeads, getSystemCalendarEvents } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
import { getSystemTasks } from '@/app/actions/system-tasks';
import { getSystemNotifications } from '@/app/actions/system-notifications';
import SystemWorkspaceClient from './SystemWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function SystemModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [initialLeads, initialEvents, initialTasks, campaignsRes, initialNotifications] = await Promise.all([
    getSystemLeads(orgSlug),
    getSystemCalendarEvents({ orgSlug, take: 200 }),
    getSystemTasks({ orgSlug, take: 200 }),
    getCampaigns(undefined, orgSlug),
    getSystemNotifications({ orgSlug, limit: 20 }),
  ]);

  const initialCampaigns = campaignsRes.success && Array.isArray(campaignsRes.data) ? campaignsRes.data : [];

  return (
    <SystemWorkspaceClient
      orgSlug={orgSlug}
      initialLeads={initialLeads}
      initialEvents={initialEvents}
      initialTasks={initialTasks}
      initialCampaigns={initialCampaigns}
      initialNotifications={initialNotifications}
    />
  );
}
