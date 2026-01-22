import GlobalProfileHub from '@/components/profile/GlobalProfileHub';

export const dynamic = 'force-dynamic';

export default async function SystemSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  await params;

  return <GlobalProfileHub defaultOrigin="system" defaultDrawer="system" />;
}
