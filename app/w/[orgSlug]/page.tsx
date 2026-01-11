import { redirect } from 'next/navigation';
import { getFirstAllowedModule, loadCurrentUserLastLocation, persistCurrentUserLastLocation, requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export const dynamic = 'force-dynamic';


export default async function WorkspaceEntryPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const allowed = Object.entries(workspace.entitlements).filter(([, v]) => v).map(([k]) => k);

  await persistCurrentUserLastLocation({ orgSlug });

  const last = await loadCurrentUserLastLocation();
  if (last?.orgSlug && String(last.orgSlug) === String(orgSlug) && last.module) {
    if (workspace.entitlements[last.module]) {
      redirect(`/w/${encodeURIComponent(orgSlug)}/${last.module}`);
    }
  }

  if (allowed.length === 1) {
    const first = getFirstAllowedModule(workspace.entitlements);
    if (first) {
      redirect(`/w/${encodeURIComponent(orgSlug)}/${first}`);
    }
  }

  redirect(`/w/${encodeURIComponent(orgSlug)}/lobby`);
}
