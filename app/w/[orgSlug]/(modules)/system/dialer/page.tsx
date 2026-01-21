import { getSystemCallHistory, getSystemLeads } from '@/app/actions/system-leads';
import SystemDialerClient from './SystemDialerClient';

export const dynamic = 'force-dynamic';

export default async function SystemDialerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [initialLeads, callHistory] = await Promise.all([
    getSystemLeads(orgSlug),
    getSystemCallHistory({ orgSlug, take: 200 }),
  ]);

  return <SystemDialerClient orgSlug={orgSlug} initialLeads={initialLeads} callHistory={callHistory} />;
}
