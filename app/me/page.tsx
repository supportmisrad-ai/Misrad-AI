import { redirect } from 'next/navigation';
import { loadCurrentUserLastLocation, requireCurrentOrganizationId, requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

// Force dynamic rendering as this page depends on authentication
export const dynamic = 'force-dynamic';

export default async function MePage() {
  const organizationId = await requireCurrentOrganizationId();
  const last = await loadCurrentUserLastLocation();

  const orgSlug = last.orgSlug ? String(last.orgSlug) : String(organizationId);

  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const moduleKey = last.module && workspace.entitlements?.[last.module] ? last.module : 'nexus';
    redirect(`/w/${encodeURIComponent(orgSlug)}/${encodeURIComponent(String(moduleKey))}/me`);
  } catch {
    redirect(`/w/${encodeURIComponent(String(organizationId))}/nexus/me`);
  }
}
