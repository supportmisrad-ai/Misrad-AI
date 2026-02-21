// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Settings from '@/components/social/Settings';

export default async function SocialHubPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  await params;
  return <Settings />;
}
