// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import Dashboard from '@/components/social/Dashboard';
import prisma from '@/lib/prisma';


export default async function SocialModuleHome({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = await params;
  const { orgSlug } = resolvedParams;

  const initialScripts = await prisma.strategic_content.findMany({
    where: { module_id: 'social', category: 'scripts' },
    select: { id: true, category: true, title: true, content: true, module_id: true },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  });

  return <Dashboard orgSlug={orgSlug} initialScripts={initialScripts} />;
}
