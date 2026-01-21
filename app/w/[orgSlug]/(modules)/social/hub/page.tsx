import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SocialHubPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/w/${encodeURIComponent(orgSlug)}/social/settings`);
}
