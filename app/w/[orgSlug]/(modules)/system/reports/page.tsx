import { redirect } from 'next/navigation';

export default async function SystemReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  redirect(`/w/${encodeURIComponent(orgSlug)}/system/analytics?tab=reports`);
}
