import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemNotificationsCenterRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  redirect(`/w/${encodeURIComponent(orgSlug)}/system/notifications`);
}
