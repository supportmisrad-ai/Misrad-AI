import NotificationsView from '@/components/system/NotificationsView';
import { getSystemNotifications } from '@/app/actions/system-notifications';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemNotificationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const initialNotifications = await getSystemNotifications({ orgSlug, limit: 200 }).catch(() => []);

  return <NotificationsView orgSlug={orgSlug} initialNotifications={initialNotifications} />;
}
