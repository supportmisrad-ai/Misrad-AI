// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import { redirect } from 'next/navigation';

export default async function SocialModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  redirect(`/w/${encodeURIComponent(orgSlug)}/social/dashboard`);
}
