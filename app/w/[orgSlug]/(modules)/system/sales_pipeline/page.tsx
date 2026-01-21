import { getSystemLeads } from '@/app/actions/system-leads';
import SystemSalesPipelineClient from '../SystemSalesPipelineClient';

export const dynamic = 'force-dynamic';

export default async function SystemSalesPipelinePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const initialLeads = await getSystemLeads(orgSlug);

  return <SystemSalesPipelineClient orgSlug={orgSlug} initialLeads={initialLeads} />;
}
