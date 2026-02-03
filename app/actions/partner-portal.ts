'use server';

import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export type PartnerPortalOrg = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string | null;
};

export type PartnerPortalSummary = {
  partnerId: string;
  partnerName: string;
  referralCode: string;
  organizations: PartnerPortalOrg[];
  paidOrdersCount: number;
  paidRevenueTotal: number;
};

export async function getPartnerPortalSummary(input: {
  referralCode: string;
}): Promise<{ success: boolean; data?: PartnerPortalSummary; error?: string }> {
  try {
    const referralCode = String(input.referralCode || '').trim();
    if (!referralCode) {
      return createErrorResponse(null, 'קוד שותף חובה');
    }

    const partnerRow = await prisma.partner.findFirst({
      where: {
        OR: [
          { referralCode },
          { referralCode: referralCode.toUpperCase() },
        ],
      },
      select: { id: true, name: true, referralCode: true },
    });

    if (!partnerRow?.id) {
      return createErrorResponse(null, 'קוד שותף לא נמצא');
    }

    const orgs = await prisma.social_organizations.findMany({
      where: { partnerId: String(partnerRow.id) },
      select: { id: true, name: true, slug: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });

    const organizations: PartnerPortalOrg[] = (Array.isArray(orgs) ? orgs : []).map((o: any) => ({
      id: String(o.id ?? ''),
      name: String(o.name ?? ''),
      slug: o.slug == null ? null : String(o.slug),
      created_at: o.created_at ? new Date(o.created_at).toISOString() : null,
    }));
    const orgIds = organizations.map((o) => o.id).filter(Boolean);

    let paidOrdersCount = 0;
    let paidRevenueTotal = 0;

    if (orgIds.length) {
      const agg = await prisma.subscription_orders.aggregate({
        where: {
          organization_id: { in: orgIds },
          status: 'paid',
        },
        _count: { _all: true },
        _sum: { amount: true },
      });

      paidOrdersCount = Number(agg?._count?._all ?? 0) || 0;

      const sumAmount: any = (agg as any)?._sum?.amount;
      if (sumAmount != null) {
        const n = typeof sumAmount?.toNumber === 'function' ? sumAmount.toNumber() : Number(sumAmount);
        if (Number.isFinite(n)) paidRevenueTotal = n;
      }
    }

    return createSuccessResponse({
      partnerId: String(partnerRow.id),
      partnerName: String(partnerRow.name),
      referralCode: String(partnerRow.referralCode),
      organizations,
      paidOrdersCount,
      paidRevenueTotal,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת פורטל שותף');
  }
}
