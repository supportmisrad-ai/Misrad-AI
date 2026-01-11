import { redirect } from 'next/navigation';
import { requireCurrentOrganizationId } from '@/lib/server/workspace';

// Force dynamic rendering as this page depends on authentication
export const dynamic = 'force-dynamic';

export default async function MePage() {
  const organizationId = await requireCurrentOrganizationId();
  redirect(`/w/${encodeURIComponent(String(organizationId))}/nexus/me`);
}
