import { getSystemLeads } from '@/app/actions/system-leads';
import SystemSalesLeadsClient from './SystemSalesLeadsClient';

export const dynamic = 'force-dynamic';

export default async function SystemSalesLeadsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const initialLeads = await getSystemLeads(orgSlug);

  return <SystemSalesLeadsClient orgSlug={orgSlug} initialLeads={initialLeads} />;
}
