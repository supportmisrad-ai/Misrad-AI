import { getSystemCalendarEvents, getSystemLeads } from '@/app/actions/system-leads';
import SystemCalendarClient from './SystemCalendarClient';

export const dynamic = 'force-dynamic';

export default async function SystemCalendarPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [initialLeads, initialEvents] = await Promise.all([
    getSystemLeads(orgSlug),
    getSystemCalendarEvents({ orgSlug, take: 300 }),
  ]);

  return <SystemCalendarClient orgSlug={orgSlug} initialLeads={initialLeads} initialEvents={initialEvents} />;
}
