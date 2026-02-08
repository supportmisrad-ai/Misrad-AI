import Dashboard from '@/components/social/Dashboard';

export const dynamic = 'force-dynamic';


export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  return <Dashboard orgSlug={orgSlug} />;
}
