export const dynamic = 'force-dynamic';

import Dashboard from '@/components/social/Dashboard';


export default async function SocialModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  return <Dashboard orgSlug={orgSlug} />;
}
