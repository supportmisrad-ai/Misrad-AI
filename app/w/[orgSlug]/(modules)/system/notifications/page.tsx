import NotificationsView from '@/components/system/NotificationsView';
import { getSystemNotifications } from '@/app/actions/system-notifications';

export const dynamic = 'force-dynamic';

export default async function SystemNotificationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const initialNotifications = await getSystemNotifications({ orgSlug, limit: 200 });

  return <NotificationsView orgSlug={orgSlug} initialNotifications={initialNotifications as any} />;
}
