export const dynamic = 'force-dynamic';

import { getOperationsDashboardData } from '@/app/actions/operations';
import { OperationsDashboard } from '@/views/OperationsDashboard';

export default async function OperationsModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const res = await getOperationsDashboardData({ orgSlug });
  return <OperationsDashboard orgSlug={orgSlug} initialData={res.success ? res.data : undefined} />;
}
