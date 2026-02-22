import SystemAutomationsClient from './SystemAutomationsClient';

export default async function SystemAutomationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return <SystemAutomationsClient orgSlug={orgSlug} />;
}
