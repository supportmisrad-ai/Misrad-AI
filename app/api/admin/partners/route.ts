import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getErrorMessage } from '@/lib/shared/unknown';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user.isSuperAdmin) {
      return apiError('נדרשות הרשאות סופר אדמין', { status: 403 });
    }

    // Get all partners with their organizations
    const allPartners = await prisma.partner.findMany({
      select: {
        id: true,
        name: true,
        referralCode: true,
        createdAt: true,
        organizations: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orgIds = allPartners.flatMap((p) => p.organizations.map((o) => o.id));

    // Aggregate paid orders per partner
    let orderAgg: Record<string, { count: number; revenue: number }> = {};
    if (orgIds.length) {
      const orders = await prisma.subscription_orders.groupBy({
        by: ['organization_id'],
        where: {
          organization_id: { in: orgIds },
          status: 'paid',
        },
        _count: { _all: true },
        _sum: { amount: true },
      });

      for (const row of orders) {
        const oid = String(row.organization_id);
        const sumRaw = row._sum?.amount ?? null;
        let revenue = 0;
        if (sumRaw != null) {
          const n = sumRaw instanceof Prisma.Decimal ? sumRaw.toNumber() : Number(sumRaw);
          if (Number.isFinite(n)) revenue = n;
        }
        orderAgg[oid] = { count: Number(row._count?._all ?? 0), revenue };
      }
    }

    // Get SystemPartner data for commission tracking
    const systemPartners = await prisma.systemPartner.findMany({
      select: {
        id: true,
        name: true,
        referrals: true,
        revenue: true,
        commissionRate: true,
        unpaidCommission: true,
      },
    });

    const systemPartnerMap = new Map(
      systemPartners.map((sp) => [sp.name, sp])
    );

    const partners = allPartners.map((p) => {
      const partnerOrgIds = p.organizations.map((o) => o.id);
      let paidOrders = 0;
      let paidRevenue = 0;
      for (const oid of partnerOrgIds) {
        const agg = orderAgg[oid];
        if (agg) {
          paidOrders += agg.count;
          paidRevenue += agg.revenue;
        }
      }

      // Try to match with SystemPartner for commission data
      const systemPartner = systemPartnerMap.get(p.name);
      const commissionRate = systemPartner?.commissionRate
        ? Number(systemPartner.commissionRate)
        : 10; // Default 10%
      const unpaidCommission = systemPartner?.unpaidCommission
        ? Number(systemPartner.unpaidCommission)
        : Math.round(paidRevenue * (commissionRate / 100));
      const totalEarned = systemPartner?.revenue
        ? Number(systemPartner.revenue)
        : 0;

      return {
        id: String(p.id),
        name: String(p.name),
        referralCode: String(p.referralCode),
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        orgsCount: partnerOrgIds.length,
        paidOrders,
        paidRevenue,
        commissionRate,
        unpaidCommission,
        totalEarned,
        status: 'active',
      };
    });

    // Calculate monthly stats (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyStats = [];

    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthStr = monthStart.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

      // Get referrals created in this month
      const monthOrgs = await prisma.organization.findMany({
        where: {
          partnerId: { not: null },
          created_at: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: { id: true },
      });

      const monthOrgIds = monthOrgs.map((o) => o.id);

      // Get revenue from these orgs
      let monthRevenue = 0;
      if (monthOrgIds.length > 0) {
        const monthOrders = await prisma.subscription_orders.aggregate({
          where: {
            organization_id: { in: monthOrgIds },
            status: 'paid',
            created_at: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: { amount: true },
        });
        if (monthOrders._sum.amount) {
          monthRevenue = Number(monthOrders._sum.amount);
        }
      }

      monthlyStats.push({
        month: monthStr,
        referrals: monthOrgIds.length,
        revenue: monthRevenue,
        commissions: Math.round(monthRevenue * 0.1),
      });
    }

    return apiSuccess({ partners, monthlyStats });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: IS_PROD ? 'Failed to load partners' : getErrorMessage(e) || 'Failed to load partners' });
  }
}

async function POSTHandler(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user.isSuperAdmin) {
      return apiError('נדרשות הרשאות סופר אדמין', { status: 403 });
    }

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const body = bodyJson as Record<string, unknown>;

    const name = String(body.name || '').trim();
    if (!name) {
      return apiError('שם שותף חובה', { status: 400 });
    }

    let referralCode = String(body.referralCode || '').trim().toUpperCase();
    if (!referralCode) {
      // Auto-generate a code from name + random
      const slug = name.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '').slice(0, 6).toUpperCase();
      referralCode = `${slug || 'REF'}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }

    // Check uniqueness
    const existing = await prisma.partner.findFirst({
      where: { referralCode },
      select: { id: true },
    });
    if (existing) {
      return apiError('קוד הפניה כבר קיים', { status: 409 });
    }

    const created = await prisma.partner.create({
      data: {
        name,
        referralCode,
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        createdAt: true,
      },
    });

    // Also create SystemPartner for tracking commissions
    await prisma.systemPartner.upsert({
      where: { id: String(created.id) },
      create: {
        id: String(created.id),
        name: created.name,
        type: 'affiliate',
        referrals: 0,
        revenue: 0,
        commissionRate: 10,
        unpaidCommission: 0,
        lastActive: new Date().toISOString(),
        avatar: '',
        status: 'active',
      },
      update: {
        name: created.name,
      },
    });

    return apiSuccess({
      partner: {
        id: String(created.id),
        name: String(created.name),
        referralCode: String(created.referralCode),
        createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : null,
        orgsCount: 0,
        paidOrders: 0,
        paidRevenue: 0,
        commissionRate: 10,
        unpaidCommission: 0,
        totalEarned: 0,
        status: 'active',
      },
    });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: IS_PROD ? 'Failed to create partner' : getErrorMessage(e) || 'Failed to create partner' });
  }
}

export const GET = shabbatGuard(GETHandler);
export const POST = shabbatGuard(POSTHandler);
