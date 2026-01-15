import 'server-only';

import { createClient } from '@/lib/supabase';

export async function countOrganizationActiveUsers(organizationId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('social_users')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(error.message);
  }

  return Number(count || 0);
}
