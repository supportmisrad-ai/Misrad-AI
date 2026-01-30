import { listNexusTasksByOrgSlug } from '@/app/actions/nexus';
import SystemTasksClient from './SystemTasksClient';

export const dynamic = 'force-dynamic';

export default async function SystemTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const list = await listNexusTasksByOrgSlug({ orgSlug, page: 1, pageSize: 200 });

  return <SystemTasksClient orgSlug={orgSlug} initialTasks={list.tasks} />;
}
