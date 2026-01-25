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

  const initialLeads = await getSystemLeads(orgSlug).catch(() => []);
  const initialEvents = await getSystemCalendarEvents({ orgSlug, take: 200 }).catch(() => []);
  const initialTasks = await getSystemTasks({ orgSlug, take: 200 }).catch(() => []);
  const campaignsRes = await getCampaigns(undefined, orgSlug).catch(() => ({ success: false, data: [] } as any));
  const initialNotifications = await getSystemNotifications({ orgSlug, limit: 20 }).catch(() => []);

  const initialCampaigns = campaignsRes?.success && Array.isArray(campaignsRes.data) ? campaignsRes.data : [];

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
