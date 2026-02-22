import SystemCallAnalyzerClient from './SystemCallAnalyzerClient';

export default async function SystemCallAnalyzerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return <SystemCallAnalyzerClient orgSlug={orgSlug} />;
}
