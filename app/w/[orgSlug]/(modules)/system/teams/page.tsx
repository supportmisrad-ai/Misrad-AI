import SystemTeamsClient from './SystemTeamsClient';

export default async function SystemTeamsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return <SystemTeamsClient orgSlug={orgSlug} />;
}
