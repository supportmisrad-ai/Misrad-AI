'use server';

import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { createClient } from '@/lib/supabase';

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

    const supabase = createClient();

    const { data: partner } = await supabase
      .from('partners')
      .select('id, name, referral_code')
      .eq('referral_code', referralCode)
      .maybeSingle();

    const partnerRow = partner
      ? partner
      : (
          await supabase
            .from('partners')
            .select('id, name, referral_code')
            .eq('referral_code', referralCode.toUpperCase())
            .maybeSingle()
        ).data;

    if (!partnerRow?.id) {
      return createErrorResponse(null, 'קוד שותף לא נמצא');
    }

    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at')
      .eq('partner_id', partnerRow.id)
      .order('created_at', { ascending: false });

    const organizations = (orgs || []) as PartnerPortalOrg[];
    const orgIds = organizations.map((o) => o.id).filter(Boolean);

    let paidOrdersCount = 0;
    let paidRevenueTotal = 0;

    if (orgIds.length) {
      const { data: orders } = await supabase
        .from('subscription_orders')
        .select('amount, organization_id, status')
        .in('organization_id', orgIds)
        .eq('status', 'paid');

      const list: unknown[] = Array.isArray(orders) ? orders : [];
      for (const o of list) {
        const obj = asObject(o) ?? {};
        paidOrdersCount += 1;
        const amount = Number(obj.amount);
        if (Number.isFinite(amount)) paidRevenueTotal += amount;
      }
    }

    return createSuccessResponse({
      partnerId: partnerRow.id,
      partnerName: partnerRow.name,
      referralCode: partnerRow.referral_code,
      organizations,
      paidOrdersCount,
      paidRevenueTotal,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת פורטל שותף');
  }
}
