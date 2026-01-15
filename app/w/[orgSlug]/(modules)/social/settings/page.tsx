import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SocialSettingsRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/w/${encodeURIComponent(orgSlug)}/admin?system=social`);
}
