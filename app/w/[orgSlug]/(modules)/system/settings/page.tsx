import GlobalProfileHub from '@/components/profile/GlobalProfileHub';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  await params;

  return <GlobalProfileHub defaultOrigin="system" defaultDrawer="system" />;
}
