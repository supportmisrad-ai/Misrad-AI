import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

async function GETHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 200)));

    const organizations = await prisma.social_organizations.findMany({
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
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
