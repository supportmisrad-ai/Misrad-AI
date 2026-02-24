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

  // Dashboard loads 4 independent data sources in parallel.
  // Actions with internal try/catch (getSystemLeadsPage, getCampaigns) never throw.
  // Actions without (getSystemCalendarEventsRange, getSystemNotifications) have
  // .catch() for graceful degradation — the dashboard shows partial data rather
  // than a full error page when a non-critical source fails after retries.
  const [leadsRes, initialEvents, campaignsRes, initialNotifications] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 50 }),
    getSystemCalendarEventsRange({
      orgSlug,
      from: startOfMonth.toISOString(),
      to: startOfNextMonth.toISOString(),
      take: 50,
    }).catch((e: unknown) => {
      console.error('[SystemHome] getSystemCalendarEventsRange failed after retries:', e instanceof Error ? e.message : e);
      return [];
    }),
    getCampaigns(undefined, orgSlug),
    getSystemNotifications({ orgSlug, limit: 20 }).catch((e: unknown) => {
      console.error('[SystemHome] getSystemNotifications failed after retries:', e instanceof Error ? e.message : e);
      return [];
    }),
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
