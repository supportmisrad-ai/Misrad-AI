import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SystemCommsRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  redirect(`/w/${encodeURIComponent(orgSlug)}/system/dialer`);
}
