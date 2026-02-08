import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function FinanceModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;
  redirect(`/w/${encodeURIComponent(orgSlug)}/finance/overview`);
}
