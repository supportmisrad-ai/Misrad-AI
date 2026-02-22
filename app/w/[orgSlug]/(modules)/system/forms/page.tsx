import SystemFormsClient from './SystemFormsClient';

export default async function SystemFormsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return <SystemFormsClient orgSlug={orgSlug} />;
}
