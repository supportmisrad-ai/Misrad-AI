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

  const [leadsRes, initialEvents] = await Promise.all([
    getSystemLeadsPage({ orgSlug, pageSize: 200 }),
    getSystemCalendarEventsRange({ orgSlug, from: startOfMonth.toISOString(), to: startOfNextMonth.toISOString(), take: 200 }),
  ]);

  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];

  return <SystemCalendarClient orgSlug={orgSlug} initialLeads={initialLeads} initialEvents={initialEvents} />;
}
