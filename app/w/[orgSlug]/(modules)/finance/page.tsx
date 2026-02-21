import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function FinanceModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  redirect(`/w/${encodeURIComponent(orgSlug)}/finance/overview`);
}
