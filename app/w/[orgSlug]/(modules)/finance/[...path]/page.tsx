import { redirect } from 'next/navigation';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function FinanceCatchAllPage({
  params,
}: {
  params: Promise<{ orgSlug: string; path: string[] }> | { orgSlug: string; path: string[] };
}) {
  const { orgSlug } = await params;
  await requireWorkspaceAccessByOrgSlug(orgSlug);
  redirect(`/w/${encodeURIComponent(orgSlug)}/finance`);
}
