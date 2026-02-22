import { getSystemLeadsPage } from '@/app/actions/system-leads';
import SystemSettingsClient from './SystemSettingsClient';

export default async function SystemSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const leadsRes = await getSystemLeadsPage({ orgSlug, pageSize: 200 });
  const initialLeads = leadsRes.success ? leadsRes.data.leads : [];

  return <SystemSettingsClient orgSlug={orgSlug} initialLeads={initialLeads} />;
}
