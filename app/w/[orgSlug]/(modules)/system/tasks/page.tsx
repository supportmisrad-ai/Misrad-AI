import { listNexusTasksByOrgSlug } from '@/app/actions/nexus';
import SystemTasksClient from './SystemTasksClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const list = await listNexusTasksByOrgSlug({ orgSlug, page: 1, pageSize: 50 });

  return <SystemTasksClient orgSlug={orgSlug} initialTasks={list.tasks} />;
}
