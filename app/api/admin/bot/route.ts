/**
 * Admin Bot API — GET /api/admin/bot
 * Returns bot leads + dashboard stats for the admin panel.
 *
 * @guard SUPERADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { getErrorMessage } from '@/lib/shared/unknown';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest) {
  return withTenantIsolationContext(
    { source: 'api/admin/bot.GET', reason: 'admin_bot_dashboard', mode: 'global_admin', isSuperAdmin: true, suppressReporting: true },
    async () => {
  try {
    await requireSuperAdmin();

    const search = req.nextUrl.searchParams.get('search') ?? '';
    const status = req.nextUrl.searchParams.get('status') ?? '';

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { business_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.botLead.findMany({
      where,
      orderBy: { last_interaction: 'desc' },
      take: 200,
    });

    // Stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLeads, newToday, demosBooked, trials, customers, conversationsToday] = await Promise.all([
      prisma.botLead.count(),
      prisma.botLead.count({ where: { created_at: { gte: todayStart } } }),
      prisma.botLead.count({ where: { status: 'demo_booked' } }),
      prisma.botLead.count({ where: { status: 'trial' } }),
      prisma.botLead.count({ where: { status: 'customer' } }),
      prisma.botConversation.count({ where: { created_at: { gte: todayStart } } }),
    ]);

    return json({
      leads,
      stats: { totalLeads, newToday, demosBooked, trials, customers, conversationsToday },
    });
  } catch (err: unknown) {
    console.error('[admin-bot]', getErrorMessage(err));
    return json({ error: 'Internal error' }, 500);
  }
    },
  );
}
