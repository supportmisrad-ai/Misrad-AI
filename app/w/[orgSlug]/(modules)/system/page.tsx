import { getSystemLeadsPage, getSystemCalendarEventsRange } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
import { listNexusTasksByOrgSlug } from '@/app/actions/nexus';
import { getSystemNotifications } from '@/app/actions/system-notifications';
import SystemWorkspaceClient from './SystemWorkspaceClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  type LeadsRes = Awaited<ReturnType<typeof getSystemLeadsPage>>;
  type TasksRes = Awaited<ReturnType<typeof listNexusTasksByOrgSlug>>;
  type CampaignsRes = Awaited<ReturnType<typeof getCampaigns>>;

  // Run ALL data fetches in parallel instead of sequentially
  const [leadsRes, initialEvents, tasksRes, campaignsRes, initialNotifications] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 200 }).catch((): LeadsRes => ({
      success: false,
      error: 'שגיאה בטעינת לידים',
    })),
    getSystemCalendarEventsRange({
      orgSlug,
      from: startOfMonth.toISOString(),
      to: startOfNextMonth.toISOString(),
      take: 200,
    }).catch(() => []),
    listNexusTasksByOrgSlug({ orgSlug, page: 1, pageSize: 200 }).catch((): TasksRes => ({
      tasks: [],
      page: 1,
      pageSize: 200,
      hasMore: false,
    })),
    getCampaigns(undefined, orgSlug).catch((): CampaignsRes => ({
      success: false,
      error: 'שגיאה בטעינת קמפיינים',
    })),
    getSystemNotifications({ orgSlug, limit: 20 }).catch(() => []),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];
  const initialTasks = tasksRes.tasks;
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
