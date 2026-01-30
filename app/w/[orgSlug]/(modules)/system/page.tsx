import { getSystemLeadsPage, getSystemCalendarEventsRange } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
import { listNexusTasksByOrgSlug } from '@/app/actions/nexus';
import { getSystemNotifications } from '@/app/actions/system-notifications';
import SystemWorkspaceClient from './SystemWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function SystemModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const leadsRes = await getSystemLeadsPage({ orgSlug, pageSize: 200 }).catch(() => ({ success: false } as any));
  const initialLeads = leadsRes?.success ? leadsRes.data.leads : [];
  const initialEvents = await getSystemCalendarEventsRange({ orgSlug, from: startOfMonth.toISOString(), to: startOfNextMonth.toISOString(), take: 500 }).catch(() => []);
  const tasksRes = await listNexusTasksByOrgSlug({ orgSlug, page: 1, pageSize: 200 }).catch(() => ({ tasks: [] as any[] } as any));
  const campaignsRes = await getCampaigns(undefined, orgSlug).catch(() => ({ success: false, data: [] } as any));
  const initialNotifications = await getSystemNotifications({ orgSlug, limit: 20 }).catch(() => []);

  const initialTasks = Array.isArray((tasksRes as any)?.tasks) ? (tasksRes as any).tasks : [];

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
