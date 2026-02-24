import { getSystemLeadsPage } from '@/app/actions/system-leads';
import { getCampaigns } from '@/app/actions/campaigns';
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

  type LeadsRes = Awaited<ReturnType<typeof getSystemLeadsPage>>;
  type CampaignsRes = Awaited<ReturnType<typeof getCampaigns>>;
  const [leadsRes, campaignsRes] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 50 }).catch((): LeadsRes => ({
      success: false,
      error: 'שגיאה בטעינת לידים',
    })),
    getCampaigns(undefined, orgSlug).catch((): CampaignsRes => ({
      success: false,
      error: 'שגיאה בטעינת קמפיינים',
    })),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];

  const initialCampaigns = campaignsRes.success && Array.isArray(campaignsRes.data) ? campaignsRes.data : [];

  return <SystemAnalyticsClient initialLeads={initialLeads} initialCampaigns={initialCampaigns} initialTab={initialTab} />;
}
