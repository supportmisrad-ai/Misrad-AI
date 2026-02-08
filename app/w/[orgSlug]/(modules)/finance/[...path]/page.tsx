import { redirect } from 'next/navigation';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export const dynamic = 'force-dynamic';

export default async function FinanceCatchAllPage({
  params,
}: {
  params: Promise<{ orgSlug: string; path: string[] }> | { orgSlug: string; path: string[] };
}) {
  const { orgSlug } = await params;
  await requireWorkspaceAccessByOrgSlug(orgSlug);
  redirect(`/w/${encodeURIComponent(orgSlug)}/finance`);
}
