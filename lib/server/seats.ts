import 'server-only';

import prisma from '@/lib/prisma';

export async function countOrganizationActiveUsers(organizationId: string): Promise<number> {
  try {
    // NOTE: Prisma schema might not include social_users.is_active in some environments.
    // We still enforce seats using organization scope and excluding deleted users.
    const count = await prisma.social_users.count({
      where: {
        organization_id: organizationId,
        role: { not: 'deleted' },
      },
    });
    return Number(count || 0);
  } catch (e: any) {
    throw new Error(e?.message || 'Failed to count active users');
  }
}
