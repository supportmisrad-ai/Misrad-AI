import { redirect } from 'next/navigation';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import MyTasksPageClient from '@/components/tasks/MyTasksPageClient';

export default async function MyTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const orgSlug = resolvedParams.orgSlug;

  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    
    return (
      <div className="min-h-screen bg-slate-50">
        <MyTasksPageClient orgId={workspace.id} orgSlug={orgSlug} />
      </div>
    );
  } catch {
    redirect('/login');
  }
}
