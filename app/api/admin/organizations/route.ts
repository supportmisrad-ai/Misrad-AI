import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(req: Request) {
  return await withTenantIsolationContext(
    {
      source: 'api/admin/organizations.GET',
      reason: 'admin_list_organizations',
      mode: 'global_admin',
      isSuperAdmin: true,
      suppressReporting: true,
    },
    async () => {
      try {
        await requireSuperAdmin();

        const url = new URL(req.url);
        const q = (url.searchParams.get('q') || '').trim();
        const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 200)));

        const organizations = await prisma.organization.findMany({
          where: q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { slug: { contains: q, mode: 'insensitive' } },
                ],
              }
            : undefined,
          select: {
            id: true,
            name: true,
            slug: true,
            owner_id: true,
            has_nexus: true,
            has_system: true,
            has_social: true,
            has_finance: true,
            has_client: true,
            subscription_status: true,
            subscription_plan: true,
            created_at: true,
            updated_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: limit,
        });

        return NextResponse.json({ success: true, organizations: organizations || [] });
      } catch (e: unknown) {
        const msg = getErrorMessage(e) || String(e ?? '');
        const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
        const safeMsg = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Internal server error';
        return NextResponse.json({ error: IS_PROD ? safeMsg : msg }, { status });
      }
    }
  );
}

export const GET = shabbatGuard(GETHandler);
