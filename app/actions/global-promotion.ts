'use server';

/**
 * Global Promotion Actions
 * Manages site-wide promotional campaigns with FOMO messaging
 */

import { revalidatePath } from 'next/cache';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import type { ActionResult } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';
import * as Sentry from '@sentry/nextjs';

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'global_promotion');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

export type GlobalPromotion = {
  id: string;
  title: string;
  subtitle: string | null;
  discountPercent: number | null;
  discountAmountCents: number | null;
  badgeText: string | null;
  ctaText: string | null;
  urgencyMessage: string | null;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  displayOnSignup: boolean;
  displayOnPricing: boolean;
  couponCode: string | null;
  createdAt: Date;
};

/**
 * Get the current active global promotion (public access)
 */
export async function getActiveGlobalPromotion(): Promise<ActionResult<GlobalPromotion | null>> {
  try {
    const now = new Date();
    
    const promotion = await prisma.globalPromotion.findFirst({
      where: {
        is_active: true,
        starts_at: { lte: now },
        expires_at: { gt: now },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!promotion) {
      return createSuccessResponse(null);
    }

    return createSuccessResponse({
      id: promotion.id,
      title: promotion.title,
      subtitle: promotion.subtitle,
      discountPercent: promotion.discount_percent,
      discountAmountCents: promotion.discount_amount_cents,
      badgeText: promotion.badge_text,
      ctaText: promotion.cta_text,
      urgencyMessage: promotion.urgency_message,
      startsAt: promotion.starts_at,
      expiresAt: promotion.expires_at,
      isActive: promotion.is_active,
      displayOnSignup: promotion.display_on_signup,
      displayOnPricing: promotion.display_on_pricing,
      couponCode: promotion.coupon_code,
      createdAt: promotion.created_at,
    });
  } catch (error: unknown) {
    captureActionException(error, { action: 'getActiveGlobalPromotion' });
    return createErrorResponse(error, 'שגיאה בטעינת מבצע');
  }
}

/**
 * Get all promotions (admin only)
 */
export async function getAllPromotions(): Promise<ActionResult<GlobalPromotion[]>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', 'נדרשת התחברות');
    }

    const user = await getAuthenticatedUser();
    if (!user.isSuperAdmin) {
      return createErrorResponse(new Error('Forbidden'), 'נדרשות הרשאות Super Admin');
    }

    const promotions = await prisma.globalPromotion.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const mapped: GlobalPromotion[] = promotions.map((p: typeof promotions[0]) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      discountPercent: p.discount_percent,
      discountAmountCents: p.discount_amount_cents,
      badgeText: p.badge_text,
      ctaText: p.cta_text,
      urgencyMessage: p.urgency_message,
      startsAt: p.starts_at,
      expiresAt: p.expires_at,
      isActive: p.is_active,
      displayOnSignup: p.display_on_signup,
      displayOnPricing: p.display_on_pricing,
      couponCode: p.coupon_code,
      createdAt: p.created_at,
    }));

    return createSuccessResponse(mapped);
  } catch (error: unknown) {
    captureActionException(error, { action: 'getAllPromotions' });
    return createErrorResponse(error, 'שגיאה בטעינת מבצעים');
  }
}

/**
 * Create or update global promotion (admin only)
 */
export async function upsertGlobalPromotion(data: {
  id?: string;
  title: string;
  subtitle?: string;
  discountPercent?: number;
  discountAmountCents?: number;
  badgeText?: string;
  ctaText?: string;
  urgencyMessage?: string;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  displayOnSignup: boolean;
  displayOnPricing: boolean;
  couponCode?: string;
}): Promise<ActionResult<GlobalPromotion>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', 'נדרשת התחברות');
    }

    const currentUserData = await getAuthenticatedUser();
    if (!currentUserData.isSuperAdmin) {
      return createErrorResponse(new Error('Forbidden'), 'נדרשות הרשאות Super Admin');
    }

    // Validation
    if (!data.title || data.title.trim().length === 0) {
      return createErrorResponse(new Error('Title required'), 'כותרת היא שדה חובה');
    }

    if (data.expiresAt <= data.startsAt) {
      return createErrorResponse(new Error('Invalid dates'), 'תאריך סיום חייב להיות אחרי תאריך התחלה');
    }

    if (!data.discountPercent && !data.discountAmountCents) {
      return createErrorResponse(new Error('Discount required'), 'יש להגדיר הנחה באחוזים או בסכום קבוע');
    }

    // Validate or generate a proper UUID — guards against null/"null"/undefined serialization edge cases
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const promotionId =
      typeof data.id === 'string' && UUID_RE.test(data.id)
        ? data.id
        : crypto.randomUUID();

    // If activating this promotion, deactivate all others
    if (data.isActive) {
      await prisma.globalPromotion.updateMany({
        where: { is_active: true },
        data: { is_active: false },
      });
    }

    const promotion = await prisma.globalPromotion.upsert({
      where: { id: promotionId },
      create: {
        id: promotionId,
        title: data.title,
        subtitle: data.subtitle || null,
        discount_percent: data.discountPercent || null,
        discount_amount_cents: data.discountAmountCents || null,
        badge_text: data.badgeText || null,
        cta_text: data.ctaText || null,
        urgency_message: data.urgencyMessage || null,
        starts_at: data.startsAt,
        expires_at: data.expiresAt,
        is_active: data.isActive,
        display_on_signup: data.displayOnSignup,
        display_on_pricing: data.displayOnPricing,
        coupon_code: data.couponCode || null,
        created_by_clerk_id: currentUserData.id,
      },
      update: {
        title: data.title,
        subtitle: data.subtitle || null,
        discount_percent: data.discountPercent || null,
        discount_amount_cents: data.discountAmountCents || null,
        badge_text: data.badgeText || null,
        cta_text: data.ctaText || null,
        urgency_message: data.urgencyMessage || null,
        starts_at: data.startsAt,
        expires_at: data.expiresAt,
        is_active: data.isActive,
        display_on_signup: data.displayOnSignup,
        display_on_pricing: data.displayOnPricing,
        coupon_code: data.couponCode || null,
        updated_at: new Date(),
      },
    });

    // Revalidate all pages that might show the promotion
    revalidatePath('/pricing');

    return createSuccessResponse({
      id: promotion.id,
      title: promotion.title,
      subtitle: promotion.subtitle,
      discountPercent: promotion.discount_percent,
      discountAmountCents: promotion.discount_amount_cents,
      badgeText: promotion.badge_text,
      ctaText: promotion.cta_text,
      urgencyMessage: promotion.urgency_message,
      startsAt: promotion.starts_at,
      expiresAt: promotion.expires_at,
      isActive: promotion.is_active,
      displayOnSignup: promotion.display_on_signup,
      displayOnPricing: promotion.display_on_pricing,
      couponCode: promotion.coupon_code,
      createdAt: promotion.created_at,
    });
  } catch (error: unknown) {
    console.error('[upsertGlobalPromotion] ERROR:', error);
    console.error('[upsertGlobalPromotion] Stack:', error instanceof Error ? error.stack : 'no stack');
    console.error('[upsertGlobalPromotion] Data:', JSON.stringify(data, null, 2));
    captureActionException(error, { action: 'upsertGlobalPromotion', promotionId: data.id, errorMessage: error instanceof Error ? error.message : String(error) });
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    return createErrorResponse(error, `שגיאה בשמירת מבצע: ${errorMessage}`);
  }
}

/**
 * Delete promotion (admin only)
 */
export async function deleteGlobalPromotion(id: string): Promise<ActionResult<void>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', 'נדרשת התחברות');
    }

    const user = await getAuthenticatedUser();
    if (!user.isSuperAdmin) {
      return createErrorResponse(new Error('Forbidden'), 'נדרשות הרשאות Super Admin');
    }

    await prisma.globalPromotion.delete({
      where: { id },
    });

    revalidatePath('/pricing');

    return createSuccessResponse(undefined);
  } catch (error: unknown) {
    captureActionException(error, { action: 'deleteGlobalPromotion', id });
    return createErrorResponse(error, 'שגיאה במחיקת מבצע');
  }
}
