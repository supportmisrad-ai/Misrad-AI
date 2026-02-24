import { getSystemCalendarEventsRange, getSystemLeadsPage } from '@/app/actions/system-leads';
import SystemCalendarClient from './SystemCalendarClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemCalendarPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  type LeadsRes = Awaited<ReturnType<typeof getSystemLeadsPage>>;
  const [leadsRes, initialEvents] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 50 }).catch((): LeadsRes => ({
      success: false,
      error: '\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05d8\u05e2\u05d9\u05e0\u05ea \u05dc\u05d9\u05d3\u05d9\u05dd',
    })),
    getSystemCalendarEventsRange({ orgSlug, from: startOfMonth.toISOString(), to: startOfNextMonth.toISOString(), take: 200 }).catch(() => []),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];

  return <SystemCalendarClient orgSlug={orgSlug} initialLeads={initialLeads} initialEvents={initialEvents} />;
}
