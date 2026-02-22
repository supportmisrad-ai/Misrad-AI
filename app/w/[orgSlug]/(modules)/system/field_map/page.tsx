import SystemFieldMapClient from './SystemFieldMapClient';

export default async function SystemFieldMapPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return <SystemFieldMapClient orgSlug={orgSlug} />;
}
