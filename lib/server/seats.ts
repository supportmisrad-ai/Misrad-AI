import 'server-only';

import { createClient } from '@/lib/supabase';

export async function countOrganizationActiveUsers(organizationId: string): Promise<number> {
  const supabase = createClient();

  try {
    const withActive = await supabase
      .from('social_users')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true as any)
      .neq('role', 'deleted');

    if (withActive.error?.message) {
      const msg = String(withActive.error.message).toLowerCase();
      if (msg.includes('column') && msg.includes('is_active')) {
        const fallback = await supabase
          .from('social_users')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .neq('role', 'deleted');

        if (fallback.error) {
          throw new Error(fallback.error.message);
        }

        return Number(fallback.count || 0);
      }

      throw new Error(withActive.error.message);
    }

    return Number(withActive.count || 0);
  } catch (e: any) {
    throw new Error(e?.message || 'Failed to count active users');
  }
}
