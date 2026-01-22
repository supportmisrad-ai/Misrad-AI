import { getSystemTasks } from '@/app/actions/system-tasks';
import SystemTasksClient from './SystemTasksClient';

export const dynamic = 'force-dynamic';

export default async function SystemTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const initialTasks = await getSystemTasks({ orgSlug, take: 500 });

  return <SystemTasksClient orgSlug={orgSlug} initialTasks={initialTasks} />;
}
