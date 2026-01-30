export const dynamic = 'force-dynamic';

import Settings from '@/components/social/Settings';

export default async function SocialHubPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  await params;
  return <Settings />;
}
