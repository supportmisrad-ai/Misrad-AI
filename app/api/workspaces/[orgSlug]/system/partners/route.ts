import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(
  req: Request,
  { params }: { params: { orgSlug: string } }
) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params });
    const orgId = String(workspace.id);

    // Get all partners that have organizations linked to this workspace's org
    // For super-admin: get ALL partners in the system
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
      return {
        id: String(p.id),
        name: String(p.name),
        referralCode: String(p.referralCode),
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        orgsCount: partnerOrgIds.length,
        paidOrders,
        paidRevenue,
      };
    });

    return apiSuccess({ partners });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: IS_PROD ? 'Failed to load partners' : getErrorMessage(e) || 'Failed to load partners' });
  }
}

async function POSTHandler(
  req: Request,
  { params }: { params: { orgSlug: string } }
) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params });

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const body = asObject(bodyJson) ?? {};

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

    return apiSuccess({
      partner: {
        id: String(created.id),
        name: String(created.name),
        referralCode: String(created.referralCode),
        createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : null,
        orgsCount: 0,
        paidOrders: 0,
        paidRevenue: 0,
      },
    });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: IS_PROD ? 'Failed to create partner' : getErrorMessage(e) || 'Failed to create partner' });
  }
}

export const GET = shabbatGuard(GETHandler);
export const POST = shabbatGuard(POSTHandler);
