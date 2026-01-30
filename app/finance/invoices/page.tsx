import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { requireCurrentOrganizationId } from '@/lib/server/workspace';

export const dynamic = 'force-dynamic';

export default async function FinanceInvoicesRootRedirect() {
  const organizationId = await requireCurrentOrganizationId();
  const supabase = createClient();

  const { data: org, error } = await supabase.from('organizations').select('slug').eq('id', organizationId).maybeSingle();

  if (error || !org?.slug) {
    redirect('/workspaces');
  }

  redirect(`/w/${encodeURIComponent(String(org.slug))}/finance/invoices`);
}
