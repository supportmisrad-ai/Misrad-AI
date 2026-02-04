import { redirect } from 'next/navigation';
import { loadCurrentUserLastLocation, requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export const dynamic = 'force-dynamic';

export default async function FinanceInvoicesRootRedirect() {
  const last = await loadCurrentUserLastLocation();
  const orgSlug = last.orgSlug ? String(last.orgSlug).trim() : '';
  if (!orgSlug) {
    redirect('/workspaces');
  }

  try {
    await requireWorkspaceAccessByOrgSlug(orgSlug);
    redirect(`/w/${encodeURIComponent(orgSlug)}/finance/invoices`);
  } catch {
    redirect('/workspaces');
  }
}
