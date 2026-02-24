'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/auth';
import { isTenantAdminRole } from '@/lib/constants/roles';

// ============================================================
// Types
// ============================================================

export type BillingUpdateInput = {
  subscription_plan?: string;
  billing_cycle?: 'monthly' | 'yearly';
  seats_allowed?: number;
  billing_email?: string;
  payment_method_id?: string;
};

export type CouponValidationResult = {
  ok: boolean;
  coupon?: {
    id: string;
    code: string;
    discount_type: string;
    discount_percent: number | null;
    discount_amount: number | null;
    ends_at: Date | null;
    max_redemptions_total: number | null;
    current_redemptions: number;
  };
  error?: string;
};

async function requireSuperAdminOrReturn(): Promise<{ ok: true } | { ok: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) return { ok: false, error: authCheck.error || 'נדרשת התחברות' };

  try {
    await requireSuperAdmin();
  } catch {
    return { ok: false, error: 'אין הרשאה (נדרש Super Admin)' };
  }

  return { ok: true };
}

async function requireTenantOrgAdminOrReturn(
  orgId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const organizationId = String(orgId || '').trim();
  if (!organizationId) return { ok: false, error: 'organizationId חסר' };

  const authCheck = await requireAuth();
  if (!authCheck.success) return { ok: false, error: authCheck.error || 'נדרשת התחברות' };

  const user = await getAuthenticatedUser();
  if (user.isSuperAdmin) return { ok: true };

  const dbUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: String(user.id) },
    select: { id: true, organization_id: true, role: true },
  });

  if (!dbUser?.id) return { ok: false, error: 'אין הרשאה' };

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { owner_id: true },
  });

  if (!org?.owner_id) return { ok: false, error: 'ארגון לא נמצא' };

  if (String(org.owner_id) === String(dbUser.id)) return { ok: true };

  const userOrgId = dbUser.organization_id ? String(dbUser.organization_id) : '';
  const isPrimaryMembership = userOrgId === organizationId;

  let membershipRole: string | null = String(dbUser.role || '').trim() || null;
  if (!isPrimaryMembership) {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        user_id: String(dbUser.id),
        organization_id: organizationId,
      },
      select: { role: true },
    });

    if (!teamMember?.role) return { ok: false, error: 'אין הרשאה לארגון זה' };
    membershipRole = String(teamMember.role || '').trim() || null;
  }

  const clerkRole = String(user.role || '').trim();
  if (!isTenantAdminRole(clerkRole) && !isTenantAdminRole(membershipRole)) {
    return { ok: false, error: 'אין הרשאה (נדרש אדמין ארגון)' };
  }

  return { ok: true };
}

// ============================================================
// Billing Management
// ============================================================

export async function updateOrganizationBilling(
  orgId: string,
  input: BillingUpdateInput
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    // Validation
    if (input.seats_allowed && (input.seats_allowed < 1 || input.seats_allowed > 999)) {
      return { ok: false, error: 'מספר מקומות חייב להיות בין 1 ל-999' };
    }

    if (input.billing_email && !input.billing_email.includes('@')) {
      return { ok: false, error: 'כתובת מייל לא תקינה' };
    }

    // Update organization
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        subscription_plan: input.subscription_plan,
        billing_cycle: input.billing_cycle,
        seats_allowed: input.seats_allowed,
        billing_email: input.billing_email,
        payment_method_id: input.payment_method_id,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        subscription_plan: true,
        billing_cycle: true,
        seats_allowed: true,
        mrr: true,
        arr: true,
      },
    });

    return { ok: true, organization: org };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? '');
    const msgLower = msg.toLowerCase();
    if (msgLower.includes('forbidden') || msgLower.includes('unauthorized')) {
      return { ok: false, error: 'אין הרשאה' };
    }
    logger.error('updateOrganizationBilling', 'Error:', error);
    return { ok: false, error: 'שגיאה בעדכון פרטי חיוב' };
  }
}

// ============================================================
// Coupon System
// ============================================================

export async function validateCoupon(code: string): Promise<CouponValidationResult> {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    if (!code || code.trim().length < 4) {
      return { ok: false, error: 'קוד קופון לא תקין' };
    }

    const normalizedCode = code.trim().toUpperCase();
    const codeHash = crypto.createHash('sha256').update(normalizedCode).digest('hex');

    // Find coupon by hash
    const coupon = await prisma.coupons.findUnique({
      where: { code_hash: codeHash },
      select: {
        id: true,
        status: true,
        discount_type: true,
        discount_percent: true,
        discount_amount: true,
        starts_at: true,
        ends_at: true,
        max_redemptions_total: true,
        coupon_redemptions: {
          select: { id: true },
        },
      },
    });

    if (!coupon) {
      return { ok: false, error: 'קוד קופון לא קיים' };
    }

    if (coupon.status !== 'active') {
      return { ok: false, error: 'קופון זה אינו פעיל' };
    }

    const now = new Date();

    // Check start date
    if (coupon.starts_at && coupon.starts_at > now) {
      return { ok: false, error: 'קופון זה עדיין לא תקף' };
    }

    // Check end date
    if (coupon.ends_at && coupon.ends_at < now) {
      return { ok: false, error: 'קופון זה פג תוקף' };
    }

    // Check max redemptions
    const currentRedemptions = coupon.coupon_redemptions.length;
    if (coupon.max_redemptions_total && currentRedemptions >= coupon.max_redemptions_total) {
      return { ok: false, error: 'קופון זה הגיע למספר השימושים המקסימלי' };
    }

    return {
      ok: true,
      coupon: {
        id: coupon.id,
        code: normalizedCode,
        discount_type: coupon.discount_type,
        discount_percent: coupon.discount_percent,
        discount_amount: coupon.discount_amount ? Number(coupon.discount_amount) : null,
        ends_at: coupon.ends_at,
        max_redemptions_total: coupon.max_redemptions_total,
        current_redemptions: currentRedemptions,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? '');
    const msgLower = msg.toLowerCase();
    if (msgLower.includes('forbidden') || msgLower.includes('unauthorized')) {
      return { ok: false, error: 'אין הרשאה' };
    }
    logger.error('validateCoupon', 'Error:', error);
    return { ok: false, error: 'שגיאה בבדיקת קופון' };
  }
}

export async function applyCouponToOrganization(orgId: string, couponCode: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    // Validate coupon first
    const validation = await validateCoupon(couponCode);
    if (!validation.ok || !validation.coupon) {
      return { ok: false, error: validation.error || 'קופון לא תקין' };
    }

    const coupon = validation.coupon;

    // Check if already redeemed by this organization
    const existingRedemption = await prisma.coupon_redemptions.findFirst({
      where: {
        coupon_id: coupon.id,
        organization_id: orgId,
      },
    });

    if (existingRedemption) {
      return { ok: false, error: 'קופון זה כבר נוצל על ידי ארגון זה' };
    }

    // Get current org billing info
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        mrr: true,
        subscription_plan: true,
        seats_allowed: true,
      },
    });

    if (!org) {
      return { ok: false, error: 'ארגון לא נמצא' };
    }

    const currentMRR = Number(org.mrr || 0);

    // Calculate discount
    let discountPercent = 0;
    let discountAmount = 0;

    if (coupon.discount_type === 'percentage' && coupon.discount_percent) {
      discountPercent = coupon.discount_percent;
      discountAmount = (currentMRR * discountPercent) / 100;
    } else if (coupon.discount_type === 'fixed' && coupon.discount_amount) {
      discountAmount = coupon.discount_amount;
      discountPercent = currentMRR > 0 ? Math.round((discountAmount / currentMRR) * 100) : 0;
    }

    // Apply discount to organization
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        discount_percent: discountPercent,
        updated_at: new Date(),
      },
    });

    // Create redemption record
    await prisma.coupon_redemptions.create({
      data: {
        coupon_id: coupon.id,
        organization_id: orgId,
        amount_before: currentMRR,
        discount_amount: discountAmount,
        amount_after: currentMRR - discountAmount,
        redeemed_at: new Date(),
      },
    });

    return {
      ok: true,
      discount: {
        percent: discountPercent,
        amount: discountAmount,
        new_mrr: currentMRR - discountAmount,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? '');
    const msgLower = msg.toLowerCase();
    if (msgLower.includes('forbidden') || msgLower.includes('unauthorized')) {
      return { ok: false, error: 'אין הרשאה' };
    }
    logger.error('applyCouponToOrganization', 'Error:', error);
    return { ok: false, error: 'שגיאה בהחלת קופון' };
  }
}

// ============================================================
// Coupon CRUD — Admin Management
// ============================================================

export async function createCoupon(params: {
  code: string;
  name?: string;
  discountType: 'PERCENT' | 'FIXED_AMOUNT';
  discountPercent?: number;
  discountAmount?: number;
  minOrderAmount?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptionsTotal?: number | null;
}) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const code = String(params.code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!code || code.length < 3) return { ok: false, error: 'קוד קופון חייב להכיל לפחות 3 תווים' };

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const codeLast4 = code.slice(-4);

    const existing = await prisma.coupons.findUnique({ where: { code_hash: codeHash }, select: { id: true } });
    if (existing) return { ok: false, error: 'קוד קופון כבר קיים במערכת' };

    const coupon = await prisma.coupons.create({
      data: {
        code_hash: codeHash,
        code_last4: codeLast4.length === 4 ? codeLast4 : null,
        name: params.name?.trim() || null,
        status: 'active',
        discount_type: params.discountType,
        discount_percent: params.discountType === 'PERCENT' ? (params.discountPercent ?? 0) : null,
        discount_amount: params.discountType === 'FIXED_AMOUNT' ? (params.discountAmount ?? 0) : null,
        min_order_amount: params.minOrderAmount ? new Prisma.Decimal(params.minOrderAmount) : null,
        starts_at: params.startsAt ? new Date(params.startsAt) : null,
        ends_at: params.endsAt ? new Date(params.endsAt) : null,
        max_redemptions_total: params.maxRedemptionsTotal ?? null,
      },
    });

    revalidatePath('/app/admin/coupons');
    return { ok: true, data: { id: coupon.id, codeLast4 } };
  } catch (error) {
    logger.error('createCoupon', 'Error:', error);
    return { ok: false, error: 'שגיאה ביצירת קופון' };
  }
}

export async function listCoupons() {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const coupons = await prisma.coupons.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        code_last4: true,
        name: true,
        status: true,
        discount_type: true,
        discount_percent: true,
        discount_amount: true,
        min_order_amount: true,
        starts_at: true,
        ends_at: true,
        max_redemptions_total: true,
        created_at: true,
        coupon_redemptions: {
          select: { id: true, organization_id: true, redeemed_at: true },
          orderBy: { redeemed_at: 'desc' },
        },
      },
    });

    return {
      ok: true,
      data: coupons.map(c => ({
        id: c.id,
        codeLast4: c.code_last4,
        name: c.name,
        status: c.status,
        discountType: c.discount_type,
        discountPercent: c.discount_percent,
        discountAmount: c.discount_amount ? Number(c.discount_amount) : null,
        minOrderAmount: c.min_order_amount ? Number(c.min_order_amount) : null,
        startsAt: c.starts_at?.toISOString() ?? null,
        endsAt: c.ends_at?.toISOString() ?? null,
        maxRedemptionsTotal: c.max_redemptions_total,
        currentRedemptions: c.coupon_redemptions.length,
        createdAt: c.created_at?.toISOString() ?? null,
      })),
    };
  } catch (error) {
    logger.error('listCoupons', 'Error:', error);
    return { ok: false, error: 'שגיאה בטעינת קופונים' };
  }
}

export async function updateCouponStatus(couponId: string, newStatus: 'active' | 'disabled') {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    await prisma.coupons.update({
      where: { id: couponId },
      data: { status: newStatus, updated_at: new Date() },
    });

    revalidatePath('/app/admin/coupons');
    return { ok: true };
  } catch (error) {
    logger.error('updateCouponStatus', 'Error:', error);
    return { ok: false, error: 'שגיאה בעדכון סטטוס קופון' };
  }
}

export async function deleteCoupon(couponId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const redemptions = await prisma.coupon_redemptions.count({ where: { coupon_id: couponId } });
    if (redemptions > 0) {
      return { ok: false, error: `לא ניתן למחוק קופון שכבר מומש (${redemptions} מימושים). השבת אותו במקום.` };
    }

    await prisma.coupons.delete({ where: { id: couponId } });

    revalidatePath('/app/admin/coupons');
    return { ok: true };
  } catch (error) {
    logger.error('deleteCoupon', 'Error:', error);
    return { ok: false, error: 'שגיאה במחיקת קופון' };
  }
}

export async function removeCouponFromOrganization(orgId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        discount_percent: 0,
        updated_at: new Date(),
      },
    });

    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? '');
    const msgLower = msg.toLowerCase();
    if (msgLower.includes('forbidden') || msgLower.includes('unauthorized')) {
      return { ok: false, error: 'אין הרשאה' };
    }
    logger.error('removeCouponFromOrganization', 'Error:', error);
    return { ok: false, error: 'שגיאה בהסרת קופון' };
  }
}

// ============================================================
// Trial Management
// ============================================================

// ... rest of the code remains the same ...
export async function extendOrganizationTrial(
  orgId: string,
  additionalDays: number,
  reason?: string
) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    if (additionalDays < 1 || additionalDays > 365) {
      return { ok: false, error: 'מספר הימים חייב להיות בין 1 ל-365' };
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        subscription_status: true,
        trial_start_date: true,
        trial_days: true,
        trial_extended_days: true,
        trial_end_date: true,
      },
    });

    if (!org) {
      return { ok: false, error: 'ארגון לא נמצא' };
    }

    if (org.subscription_status !== 'trial') {
      return { ok: false, error: 'ארגון זה אינו בתקופת ניסיון' };
    }

    const currentExtendedDays = org.trial_extended_days || 0;
    const newExtendedDays = currentExtendedDays + additionalDays;

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        trial_extended_days: newExtendedDays,
        updated_at: new Date(),
      },
    });

    // Calculate new end date (trigger will do this, but we calculate for response)
    const totalDays = (org.trial_days || 7) + newExtendedDays;
    const newEndDate = org.trial_start_date
      ? new Date(org.trial_start_date.getTime() + totalDays * 24 * 60 * 60 * 1000)
      : null;

    // Log the extension (optional - you can add a trial_extensions table)
    logger.info('extendOrganizationTrial', `Extended trial for ${org.name} by ${additionalDays} days`, { additionalDays, reason: reason || 'N/A' });

    return {
      ok: true,
      trial: {
        extended_days: newExtendedDays,
        total_days: totalDays,
        new_end_date: newEndDate,
      },
    };
  } catch (error) {
    logger.error('extendOrganizationTrial', 'Error:', error);
    return { ok: false, error: 'שגיאה בהארכת תקופת ניסיון' };
  }
}

export async function convertTrialToActive(orgId: string, paymentMethodId?: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const updates: Record<string, unknown> = {
      subscription_status: 'active',
      subscription_start_date: new Date(),
      trial_extended_days: 0,
      trial_end_date: null,
      updated_at: new Date(),
    };

    if (paymentMethodId) {
      updates.payment_method_id = paymentMethodId;
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updates,
      select: {
        id: true,
        name: true,
        subscription_status: true,
        subscription_plan: true,
        mrr: true,
      },
    });

    return { ok: true, organization: org };
  } catch (error) {
    logger.error('convertTrialToActive', 'Error:', error);
    return { ok: false, error: 'שגיאה בהמרת ניסיון למנוי פעיל' };
  }
}

export async function cancelSubscription(orgId: string, reason: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    if (!reason || reason.trim().length < 5) {
      return { ok: false, error: 'יש לציין סיבת ביטול (לפחות 5 תווים)' };
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        subscription_status: 'cancelled',
        cancellation_date: new Date(),
        cancellation_reason: reason.trim(),
        updated_at: new Date(),
      },
    });

    return { ok: true };
  } catch (error) {
    logger.error('cancelSubscription', 'Error:', error);
    return { ok: false, error: 'שגיאה בביטול מנוי' };
  }
}

// ============================================================
// Revenue Calculations
// ============================================================

export async function calculateOrganizationRevenue(orgId: string) {
  try {
    const guard = await requireTenantOrgAdminOrReturn(orgId);
    if (!guard.ok) return guard;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        subscription_plan: true,
        seats_allowed: true,
        billing_cycle: true,
        discount_percent: true,
        subscription_status: true,
      },
    });

    if (!org || !org.subscription_plan) {
      return { ok: true, mrr: 0, arr: 0 };
    }

    // Base prices per seat per month
    const basePrices: Record<string, number> = {
      starter: 49,
      pro: 99,
      agency: 149,
      custom: 199,
    };

    const basePricePerSeat = basePrices[org.subscription_plan] || 0;
    const seats = org.seats_allowed || 1;
    let monthlyPrice = basePricePerSeat * seats;

    // Yearly discount (15%)
    if (org.billing_cycle === 'yearly') {
      monthlyPrice = monthlyPrice * 0.85;
    }

    // Apply coupon discount
    const discountPercent = org.discount_percent || 0;
    const mrr = monthlyPrice * (1 - discountPercent / 100);
    const arr = mrr * 12;

    return {
      ok: true,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
    };
  } catch (error) {
    logger.error('calculateOrganizationRevenue', 'Error:', error);
    return { ok: false, error: 'שגיאה בחישוב הכנסות' };
  }
}

export async function calculateClientTotalRevenue(clientId: string) {
  try {
    const guard = await requireSuperAdminOrReturn();
    if (!guard.ok) return guard;

    const orgs = await prisma.organization.findMany({
      where: {
        client_id: clientId,
        subscription_status: { in: ['trial', 'active'] },
      },
      select: {
        mrr: true,
        arr: true,
      },
    });

    const totalMRR = orgs.reduce((sum: number, org: { mrr: Prisma.Decimal | null; arr: Prisma.Decimal | null }) => sum + Number(org.mrr || 0), 0);
    const totalARR = orgs.reduce((sum: number, org: { mrr: Prisma.Decimal | null; arr: Prisma.Decimal | null }) => sum + Number(org.arr || 0), 0);

    // Update client totals
    await prisma.businessClient.update({
      where: { id: clientId },
      data: {
        mrr: Math.round(totalMRR * 100) / 100,
        arr: Math.round(totalARR * 100) / 100,
        updated_at: new Date(),
      },
    });

    return {
      ok: true,
      mrr: Math.round(totalMRR * 100) / 100,
      arr: Math.round(totalARR * 100) / 100,
      organizations_count: orgs.length,
    };
  } catch (error) {
    logger.error('calculateClientTotalRevenue', 'Error:', error);
    return { ok: false, error: 'שגיאה בחישוב הכנסות לקוח' };
  }
}

// ============================================================
// Auto-Upgrade Seats (Self-Service)
// ============================================================

export async function autoUpgradeSeats(organizationId: string, newSeats: number) {
  try {
    const guard = await requireTenantOrgAdminOrReturn(organizationId);
    if (!guard.ok) return guard;

    if (!organizationId || !newSeats || newSeats < 1) {
      return { ok: false, error: 'פרמטרים לא תקינים' };
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        seats_allowed: true,
        active_users_count: true,
        subscription_plan: true,
      },
    });

    if (!org) {
      return { ok: false, error: 'ארגון לא נמצא' };
    }

    const currentSeats = org.seats_allowed || 0;
    const activeUsers = org.active_users_count || 0;

    // Validation: can't downgrade below active users
    if (newSeats < activeUsers) {
      return { 
        ok: false, 
        error: `לא ניתן לצמצם מתחת למספר המשתמשים הפעילים (${activeUsers})` 
      };
    }

    // Validation: must be an upgrade
    if (newSeats <= currentSeats) {
      return { 
        ok: false, 
        error: 'השדרוג חייב להיות למספר גבוה יותר' 
      };
    }

    // Update seats
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        seats_allowed: newSeats,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        seats_allowed: true,
        mrr: true,
        arr: true,
      },
    });

    // Log the upgrade (console only for now - billing_events table TBD)
    logger.debug('autoUpgradeSeats', 'Upgrade completed:', {
      organizationId,
      previous_seats: currentSeats,
      new_seats: newSeats,
      active_users_at_upgrade: activeUsers,
      new_mrr: updated.mrr,
    });

    return { 
      ok: true, 
      organization: updated,
      message: `השדרוג ל-${newSeats} מקומות הצליח`,
    };
  } catch (error) {
    logger.error('autoUpgradeSeats', 'Error:', error);
    return { ok: false, error: 'שגיאה בשדרוג מקומות' };
  }
}

// ============================================================
// Get Organization Billing Info
// ============================================================

export async function getOrganizationBillingInfo(orgId: string) {
  try {
    const guard = await requireTenantOrgAdminOrReturn(orgId);
    if (!guard.ok) return guard;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        subscription_status: true,
        subscription_plan: true,
        billing_cycle: true,
        seats_allowed: true,
        billing_email: true,
        payment_method_id: true,
        next_billing_date: true,
        mrr: true,
        arr: true,
        discount_percent: true,
        trial_start_date: true,
        trial_days: true,
        trial_extended_days: true,
        trial_end_date: true,
        last_payment_date: true,
        last_payment_amount: true,
        coupon_redemptions: {
          include: {
            coupons: {
              select: {
                id: true,
                name: true,
                discount_type: true,
                discount_percent: true,
                discount_amount: true,
              },
            },
          },
          orderBy: { redeemed_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!org) {
      return { ok: false, error: 'ארגון לא נמצא' };
    }

    return { ok: true, billing: org };
  } catch (error) {
    logger.error('getOrganizationBillingInfo', 'Error:', error);
    return { ok: false, error: 'שגיאה בטעינת מידע חיוב' };
  }
}
