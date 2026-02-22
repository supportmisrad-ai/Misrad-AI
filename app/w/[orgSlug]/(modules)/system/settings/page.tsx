import SystemSettingsClient from './SystemSettingsClient';

export default async function SystemSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return <SystemSettingsClient orgSlug={orgSlug} initialLeads={[]} />;
}
