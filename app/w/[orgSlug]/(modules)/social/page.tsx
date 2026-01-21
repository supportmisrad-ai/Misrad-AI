export const dynamic = 'force-dynamic';

import Dashboard from '@/components/social/Dashboard';


export default async function SocialModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <Dashboard orgSlug={orgSlug} />;
}
