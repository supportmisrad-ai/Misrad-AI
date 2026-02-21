import Dashboard from '@/components/social/Dashboard';
import prisma from '@/lib/prisma';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls


export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const initialScripts = await prisma.strategic_content.findMany({
    where: { module_id: 'social', category: 'scripts' },
    select: { id: true, category: true, title: true, content: true, module_id: true },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  });

  return <Dashboard orgSlug={orgSlug} initialScripts={initialScripts} />;
}
