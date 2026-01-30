import { redirect } from 'next/navigation';
import { requireCurrentOrganizationId } from '@/lib/server/workspace';
import { createClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function AdminRootPage() {
  const organizationId = await requireCurrentOrganizationId();

  const supabase = createClient();
  const { data: org, error } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', organizationId)
    .maybeSingle();

  if (error || !org?.slug) {
    redirect('/workspaces');
  }

  redirect(`/w/${encodeURIComponent(String(org.slug))}/admin`);
}
