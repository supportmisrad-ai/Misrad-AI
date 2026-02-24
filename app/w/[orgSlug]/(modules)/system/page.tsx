import { getSystemLeadsPage, getSystemCalendarEventsRange } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
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
  type CampaignsRes = Awaited<ReturnType<typeof getCampaigns>>;

  const [leadsRes, initialEvents, campaignsRes, initialNotifications] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 50 }).catch((): LeadsRes => ({
      success: false,
      error: 'שגיאה בטעינת לידים',
    })),
    getSystemCalendarEventsRange({
      orgSlug,
      from: startOfMonth.toISOString(),
      to: startOfNextMonth.toISOString(),
      take: 50,
    }).catch(() => []),
    getCampaigns(undefined, orgSlug).catch((): CampaignsRes => ({
      success: false,
      error: 'שגיאה בטעינת קמפיינים',
    })),
    getSystemNotifications({ orgSlug, limit: 20 }).catch(() => []),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];
  const initialCampaigns = campaignsRes.success && Array.isArray(campaignsRes.data) ? campaignsRes.data : [];

  return (
    <SystemWorkspaceClient
      orgSlug={orgSlug}
      initialLeads={initialLeads}
      initialEvents={initialEvents}
      initialCampaigns={initialCampaigns}
      initialNotifications={initialNotifications}
    />
  );
}
