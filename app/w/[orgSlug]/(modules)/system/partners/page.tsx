import SystemPartnersClient from './SystemPartnersClient';

export default async function SystemPartnersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return <SystemPartnersClient orgSlug={orgSlug} />;
}
