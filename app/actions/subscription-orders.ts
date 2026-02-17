'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { randomUUID } from 'crypto';
import type { PackageType } from '@/lib/server/workspace';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { uploadFile } from '@/app/actions/files';
import { calculateOrderAmount } from '@/lib/billing/pricing';
import { CouponEngine } from '@/lib/server/couponEngine';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { requireWorkspaceAccessByOrgSlugApiCached } from '@/lib/server/workspace-access/access';
import prisma, { prismaForInteractiveTransaction } from '@/lib/prisma';
import { Prisma, type subscription_orders } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/auth';
import { isTenantAdminRole } from '@/lib/constants/roles';

import { asObjectLoose as asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';
const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

export type SubscriptionOrderStatus = 'pending' | 'pending_verification' | 'paid' | 'cancelled';
export type BillingCycle = 'monthly' | 'yearly';

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'subscription_orders');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const obj = asObject(error) ?? {};
  const msg = String(obj.message ?? '').toLowerCase();
  const code = String(obj.code ?? '').toLowerCase();
  return (
    code === '42703' ||
    (msg.includes('column') && msg.includes(String(columnName || '').toLowerCase()) && msg.includes('does not exist'))
  );
}

function normalizePaymentMethod(value: unknown): 'manual' | 'automatic' {
  return String(value ?? '').toLowerCase() === 'automatic' ? 'automatic' : 'manual';
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

async function requireSubscriptionOrderAccessOrReturn(params: {
  actorClerkUserId: string;
  actorOrganizationId: string | null;
  orderClerkUserId: string | null;
  orderOrganizationId: string | null;
  isSuperAdmin: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (params.isSuperAdmin) return { ok: true };
  if (params.orderClerkUserId && params.orderClerkUserId === params.actorClerkUserId) return { ok: true };

  if (params.orderOrganizationId) {
    const guard = await requireTenantOrgAdminOrReturn(String(params.orderOrganizationId));
    if (guard.ok) return { ok: true };
  }

  return { ok: false, error: 'אין הרשאה' };
}

export type CreateSubscriptionOrderInput = {
  packageType?: PackageType;
  soloModuleKey?: OSModuleKey;
  billingCycle: BillingCycle;
  amount?: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  seats?: number;
  partnerReferralCode?: string;
  couponCode?: string;
};

const BillingCycleSchema = z.enum(['monthly', 'yearly']);
const CreateSubscriptionOrderInputSchema = z.object({
  packageType: z.string().optional(),
  soloModuleKey: z.string().optional(),
  billingCycle: BillingCycleSchema,
  amount: z.number().finite().optional(),
  currency: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().min(1),
  customerPhone: z.string().min(1),
  seats: z.number().finite().optional(),
  partnerReferralCode: z.string().optional(),
  couponCode: z.string().optional(),
});

const OrderIdSchema = z.object({ orderId: z.string().min(1) });

const SubmitProofSchema = z.object({
  orderId: z.string().min(1),
  proofFile: z.instanceof(File).nullable().optional(),
});

export type SubscriptionOrder = {
  id: string;
  clerkUserId: string | null;
  socialUserId: string | null;
  organizationId: string | null;
  packageType: string | null;
  planKey: string | null;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: SubscriptionOrderStatus;
  paymentMethod: string;
  createdAt: string;
};

export type SubscriptionPaymentConfig = {
  packageType: string;
  title: string | null;
  qrImageUrl: string | null;
  instructionsText: string | null;
  paymentMethod: 'manual' | 'automatic';
  externalPaymentUrl: string | null;
};

export async function createSubscriptionOrder(
  input: CreateSubscriptionOrderInput
): Promise<{ success: boolean; data?: SubscriptionOrder; error?: string }> {
  try {
    const parsed = CreateSubscriptionOrderInputSchema.safeParse({
      ...input,
      billingCycle: input?.billingCycle,
      customerName: input?.customerName,
      customerEmail: input?.customerEmail,
      customerPhone: input?.customerPhone,
    });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'createSubscriptionOrder', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין ליצירת הזמנת מנוי');
    }

    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const clerkUserId = authCheck.userId || null;

    const customerName = String(input.customerName || '').trim();
    const customerEmail = String(input.customerEmail || '').trim();
    const customerPhone = String(input.customerPhone || '').trim();

    if (!customerName) return createErrorResponse(null, 'שם מלא חובה');
    if (!customerPhone) return createErrorResponse(null, 'טלפון חובה');
    if (!customerEmail) return createErrorResponse(null, 'מייל חובה');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return createErrorResponse(null, 'מייל לא תקין');
    }

    const socialUser = clerkUserId
      ? await prisma.organizationUser.findUnique({
          where: { clerk_user_id: String(clerkUserId) },
          select: { id: true, organization_id: true },
        })
      : null;

    const id = randomUUID();
    const now = new Date();

    const organizationId = socialUser?.organization_id ? String(socialUser.organization_id) : null;
    if (!organizationId) {
      return createErrorResponse(null, 'חסרה חברה להזמנה');
    }

    const orgAdmin = await requireTenantOrgAdminOrReturn(String(organizationId));
    if (!orgAdmin.ok) {
      return createErrorResponse(null, orgAdmin.error);
    }

    try {
      await requireWorkspaceAccessByOrgSlugApiCached(String(clerkUserId || ''), String(organizationId));
    } catch (e: unknown) {
      captureActionException(e, { action: 'createSubscriptionOrder', stage: 'workspace_access', organizationId: String(organizationId) });
      return createErrorResponse(e, 'אין הרשאה');
    }

    const packageType = (input.packageType || 'solo') as PackageType;
    const soloModuleKey = input.soloModuleKey ?? null;

    if (packageType === 'solo' && !soloModuleKey) {
      return createErrorResponse(null, 'בחירת מודול חובה (Solo)');
    }

    const seatsRaw = input.seats;
    const seatsNormalized = Number.isFinite(Number(seatsRaw)) ? Math.floor(Number(seatsRaw)) : null;
    const seats = seatsNormalized && seatsNormalized > 0 ? seatsNormalized : null;

    let calculatedAmount = 0;
    try {
      const calc = calculateOrderAmount({
        packageType,
        soloModuleKey,
        billingCycle: input.billingCycle,
        seats,
      });
      calculatedAmount = calc.amount;
    } catch (error: unknown) {
      captureActionException(error, { action: 'createSubscriptionOrder', stage: 'calculate_order_amount' });
      const errorMessage = getUnknownErrorMessage(error);
      return createErrorResponse(error, errorMessage || 'שגיאה בחישוב מחיר');
    }

    const couponCode = String(input.couponCode || '').trim();

    class CouponApplyError extends Error {
      reason: string;

      constructor(reason: string, message: string) {
        super(message);
        this.reason = reason;
      }
    }

    const couponReasonMessage = (reason: string): string => {
      switch (reason) {
        case 'INVALID_CODE':
          return 'קוד קופון לא תקין';
        case 'INACTIVE':
          return 'הקופון לא פעיל';
        case 'NOT_STARTED':
          return 'הקופון עדיין לא התחיל';
        case 'EXPIRED':
          return 'הקופון פג תוקף';
        case 'MIN_ORDER_AMOUNT':
          return 'הסכום לא עומד במינימום לקופון';
        case 'ALREADY_REDEEMED':
          return 'הקופון כבר מומש עבור החברה';
        case 'MAX_REDEMPTIONS_REACHED':
          return 'הקופון הגיע למספר מימושים מקסימלי';
        case 'ORDER_ALREADY_HAS_COUPON':
          return 'כבר הוחל קופון על ההזמנה';
        default:
          return 'שגיאה בהחלת קופון';
      }
    };

    const toNumberSafe = (value: unknown): number => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const s = String(value ?? '').trim();
      if (!s) return 0;
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    };

    let finalAmount = calculatedAmount;

    const createData: Prisma.subscription_ordersUncheckedCreateInput = {
      id,
      clerk_user_id: clerkUserId,
      social_user_id: socialUser?.id || null,
      organization_id: organizationId,
      package_type: packageType,
      plan_key: packageType === 'solo' ? String(soloModuleKey) : null,
      billing_cycle: input.billingCycle,
      amount: calculatedAmount,
      currency: input.currency || 'ILS',
      status: 'pending',
      payment_method: 'bit',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      created_at: now,
      updated_at: now,
      ...(seats ? { seats } : {}),
    };

    try {
      await prismaForInteractiveTransaction().$transaction(async (tx) => {
        try {
          await tx.subscription_orders.create({ data: createData });
        } catch (error: unknown) {
          if (seats && isMissingColumnError(error, 'seats')) {
            if (!ALLOW_SCHEMA_FALLBACKS) {
              throw new Error(`[SchemaMismatch] subscription_orders.seats missing column (${getUnknownErrorMessage(error) || 'missing column'})`);
            }

            reportSchemaFallback({
              source: 'app/actions/subscription-orders.createSubscriptionOrder',
              reason: 'subscription_orders.seats missing column (retry create without seats)',
              error,
              extras: { orderId: id },
            });
            createData.seats = undefined;
            await tx.subscription_orders.create({ data: createData });
          } else {
            throw error;
          }
        }

        if (couponCode) {
          const res = await CouponEngine.applyToSubscriptionOrder({
            orderId: id,
            organizationId: String(organizationId),
            couponCode,
            clerkUserId,
            now,
            db: tx,
          });

          if (!res.ok) {
            throw new CouponApplyError(res.reason, couponReasonMessage(res.reason));
          }

          finalAmount = toNumberSafe(res.amountAfter);
        }
      });
    } catch (error: unknown) {
      captureActionException(error, { action: 'createSubscriptionOrder', stage: 'db_transaction', orderId: id });
      if (error instanceof CouponApplyError) {
        return createErrorResponse(error, error.message);
      }
      return createErrorResponse(error, 'שגיאה ביצירת הזמנת מנוי');
    }

    const partnerReferralCode = String(input.partnerReferralCode || '').trim();
    if (partnerReferralCode) {
      let partnerId: string | null = null;
      try {
        const partner = await prisma.partner.findFirst({
          where: { referralCode: { equals: partnerReferralCode } },
          select: { id: true },
        });
        partnerId = partner?.id ? String(partner.id) : null;
      } catch (error: unknown) {
        captureActionException(error, { action: 'createSubscriptionOrder', stage: 'resolve_partner_referral' });
        partnerId = null;
      }

      if (!partnerId) {
        const upper = partnerReferralCode.toUpperCase();
        try {
          const partner = await prisma.partner.findFirst({
            where: { referralCode: { equals: upper } },
            select: { id: true },
          });
          partnerId = partner?.id ? String(partner.id) : null;
        } catch (error: unknown) {
          captureActionException(error, { action: 'createSubscriptionOrder', stage: 'resolve_partner_referral_upper' });
          partnerId = null;
        }
      }

      if (!partnerId) {
        return createErrorResponse(null, 'קוד שותף לא נמצא');
      }

      if (organizationId) {
        const guard = await requireTenantOrgAdminOrReturn(String(organizationId));
        if (!guard.ok) return createErrorResponse(null, guard.error);

        try {
          const updated = await prisma.organization.updateMany({
            where: { id: organizationId, partnerId: null },
            data: { partnerId } satisfies Prisma.OrganizationUncheckedUpdateManyInput,
          });

          if (!updated || updated.count < 1) {
            return createErrorResponse(null, 'כבר משויך שותף לחברה זו');
          }
        } catch (error: unknown) {
          captureActionException(error, { action: 'createSubscriptionOrder', stage: 'apply_partner_to_org', organizationId });
          return createErrorResponse(error, 'שגיאה בעדכון שיוך שותף');
        }
      }
    }

    const order: SubscriptionOrder = {
      id,
      clerkUserId,
      socialUserId: socialUser?.id || null,
      organizationId,
      packageType: packageType,
      planKey: packageType === 'solo' ? (soloModuleKey ? String(soloModuleKey) : null) : null,
      billingCycle: input.billingCycle,
      amount: Number(finalAmount) || 0,
      currency: String(input.currency || 'ILS'),
      status: 'pending',
      paymentMethod: 'bit',
      createdAt: now.toISOString(),
    };

    return createSuccessResponse(order);
  } catch (error: unknown) {
    captureActionException(error, { action: 'createSubscriptionOrder', stage: 'outer' });
    const errorMessage = getUnknownErrorMessage(error);
    return createErrorResponse(error, errorMessage || 'שגיאה ביצירת הזמנת מנוי');
  }
}

export async function getSubscriptionOrder(
  orderId: string
): Promise<{ success: boolean; data?: subscription_orders; error?: string }> {
  try {
    const parsed = OrderIdSchema.safeParse({ orderId });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'getSubscriptionOrder', stage: 'validate_input' });
      return createErrorResponse('Missing orderId', 'שגיאה בטעינת הזמנת מנוי');
    }

    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const actorClerkUserId = String(authCheck.userId || '').trim();
    if (!actorClerkUserId) return createErrorResponse('Unauthorized', 'נדרשת התחברות');

    const actor = await getAuthenticatedUser();
    const socialUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: actorClerkUserId },
      select: { id: true, organization_id: true },
    });
    const actorSocialUserId = socialUser?.id ? String(socialUser.id) : null;
    const actorOrganizationId = socialUser?.organization_id ? String(socialUser.organization_id) : null;

    const id = String(parsed.data.orderId || '').trim();
    if (!id) return createErrorResponse('Missing orderId', 'שגיאה בטעינת הזמנת מנוי');

    const allowedOrganizationIds = new Set<string>();
    if (actorOrganizationId) allowedOrganizationIds.add(String(actorOrganizationId));
    if (actorSocialUserId) {
      try {
        const teamMemberships = await prisma.teamMember.findMany({
          where: { user_id: actorSocialUserId },
          select: { organization_id: true },
        });
        for (const tm of teamMemberships) {
          const oid = tm?.organization_id ? String(tm.organization_id).trim() : '';
          if (oid) allowedOrganizationIds.add(oid);
        }
      } catch (e: unknown) {
        captureActionException(e, { action: 'getSubscriptionOrder', stage: 'team_memberships' });
      }
    }

    const orgIdList = Array.from(allowedOrganizationIds);

    const row = actor.isSuperAdmin
      ? await withTenantIsolationContext(
          { source: 'app/actions/subscription-orders.getSubscriptionOrder', mode: 'global_admin', isSuperAdmin: true },
          async () =>
            prisma.subscription_orders.findFirst({
              where: { id },
            })
        )
      : orgIdList.length
        ? await prisma.subscription_orders.findFirst({
            where: { id, organization_id: { in: orgIdList } },
          })
        : null;

    if (!row) {
      return createErrorResponse('Not found', 'שגיאה בטעינת הזמנת מנוי');
    }

    const orderClerkUserId = row.clerk_user_id ? String(row.clerk_user_id) : null;
    const orderOrganizationId = row.organization_id ? String(row.organization_id) : null;

    if (!actor.isSuperAdmin && orderOrganizationId) {
      try {
        await requireWorkspaceAccessByOrgSlugApiCached(actorClerkUserId, String(orderOrganizationId));
      } catch (e: unknown) {
        return createErrorResponse('Forbidden', 'אין הרשאה');
      }
    }

    const access = await requireSubscriptionOrderAccessOrReturn({
      actorClerkUserId,
      actorOrganizationId,
      orderClerkUserId,
      orderOrganizationId,
      isSuperAdmin: actor.isSuperAdmin,
    });
    if (!access.ok) return createErrorResponse('Forbidden', access.error);

    return createSuccessResponse(row);
  } catch (error: unknown) {
    captureActionException(error, { action: 'getSubscriptionOrder' });
    const errorMessage = getUnknownErrorMessage(error);
    return createErrorResponse(error, errorMessage || 'שגיאה בטעינת הזמנת מנוי');
  }
}

export async function getSubscriptionPaymentConfig(
  packageType: PackageType
): Promise<{ success: boolean; data?: SubscriptionPaymentConfig; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const data = await prisma.subscription_payment_configs.findUnique({
      where: { package_type: String(packageType) },
      select: { package_type: true, title: true, qr_image_url: true, instructions_text: true, payment_method: true, external_payment_url: true },
    });

    if (!data) {
      return createSuccessResponse({
        packageType,
        title: null,
        qrImageUrl: null,
        instructionsText: null,
        paymentMethod: 'manual',
        externalPaymentUrl: null,
      } satisfies SubscriptionPaymentConfig);
    }

    return createSuccessResponse({
      packageType: String(data.package_type ?? packageType),
      title: data.title == null ? null : String(data.title),
      qrImageUrl: data.qr_image_url == null ? null : String(data.qr_image_url),
      instructionsText: data.instructions_text == null ? null : String(data.instructions_text),
      paymentMethod: normalizePaymentMethod(data.payment_method),
      externalPaymentUrl: data.external_payment_url == null ? null : String(data.external_payment_url),
    } satisfies SubscriptionPaymentConfig);
  } catch (error: unknown) {
    captureActionException(error, { action: 'getSubscriptionPaymentConfig', packageType: String(packageType) });
    const errorMessage = getUnknownErrorMessage(error);
    return createErrorResponse(error, errorMessage || 'שגיאה בטעינת הגדרות תשלום');
  }
}

export async function submitSubscriptionPaymentProof(input: {
  orderId: string;
  proofFile?: File | null;
}): Promise<{ success: boolean; data?: { url?: string; path?: string } ; error?: string }> {
  try {
    const parsed = SubmitProofSchema.safeParse({ orderId: input?.orderId, proofFile: input?.proofFile ?? null });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'submitSubscriptionPaymentProof', stage: 'validate_input' });
      return createErrorResponse('Invalid input', 'קלט לא תקין');
    }

    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const actorClerkUserId = String(authCheck.userId || '').trim();
    if (!actorClerkUserId) return createErrorResponse('Unauthorized', 'נדרשת התחברות');

    const actor = await getAuthenticatedUser();
    const actorMembership = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: actorClerkUserId },
      select: { id: true, organization_id: true },
    });
    const actorSocialUserId = actorMembership?.id ? String(actorMembership.id) : null;
    const actorOrganizationId = actorMembership?.organization_id ? String(actorMembership.organization_id) : null;

    const orderId = String(parsed.data.orderId || '').trim();
    if (!orderId) {
      return createErrorResponse('Missing orderId', 'שגיאה בטעינת הזמנה');
    }

    const allowedOrganizationIds = new Set<string>();
    if (actorOrganizationId) allowedOrganizationIds.add(String(actorOrganizationId));
    if (actorSocialUserId) {
      try {
        const teamMemberships = await prisma.teamMember.findMany({
          where: { user_id: actorSocialUserId },
          select: { organization_id: true },
        });
        for (const tm of teamMemberships) {
          const oid = tm?.organization_id ? String(tm.organization_id).trim() : '';
          if (oid) allowedOrganizationIds.add(oid);
        }
      } catch (e: unknown) {
        captureActionException(e, { action: 'submitSubscriptionPaymentProof', stage: 'team_memberships' });
      }
    }

    const orgIdList = Array.from(allowedOrganizationIds);

    const order = actor.isSuperAdmin
      ? await withTenantIsolationContext(
          { source: 'app/actions/subscription-orders.submitSubscriptionPaymentProof', mode: 'global_admin', isSuperAdmin: true },
          async () =>
            prisma.subscription_orders.findFirst({
              where: { id: orderId },
              select: { id: true, clerk_user_id: true, status: true, organization_id: true },
            })
        )
      : orgIdList.length
        ? await prisma.subscription_orders.findFirst({
            where: { id: orderId, organization_id: { in: orgIdList } },
            select: { id: true, clerk_user_id: true, status: true, organization_id: true },
          })
        : null;

    if (!order?.id) {
      return createErrorResponse(new Error('Order not found'), 'הזמנה לא נמצאה');
    }

    const orderClerkUserId = order.clerk_user_id ? String(order.clerk_user_id) : null;
    const orderOrganizationId = order.organization_id ? String(order.organization_id) : null;

    if (!actor.isSuperAdmin && orderOrganizationId) {
      try {
        await requireWorkspaceAccessByOrgSlugApiCached(actorClerkUserId, String(orderOrganizationId));
      } catch (e: unknown) {
        return createErrorResponse(new Error('Forbidden'), 'אין הרשאה לעדכן הזמנה זו');
      }
    }

    const access = await requireSubscriptionOrderAccessOrReturn({
      actorClerkUserId,
      actorOrganizationId,
      orderClerkUserId,
      orderOrganizationId,
      isSuperAdmin: actor.isSuperAdmin,
    });
    if (!access.ok) return createErrorResponse(new Error('Forbidden'), 'אין הרשאה לעדכן הזמנה זו');

    const now = new Date();

    let proof: { url?: string; path?: string } = {};
    if (parsed.data.proofFile) {
      const organizationId = order.organization_id ? String(order.organization_id) : '';
      if (!organizationId) {
        return createErrorResponse(new Error('Missing organization'), 'חסרה חברה להזמנה');
      }

      let orgSlug = '';
      try {
        const ws = await requireWorkspaceAccessByOrgSlugApiCached(actorClerkUserId, String(organizationId));
        orgSlug = String(ws.slug || ws.id || '').trim();
      } catch (e: unknown) {
        captureActionException(e, {
          action: 'submitSubscriptionPaymentProof',
          stage: 'resolve_org_slug',
          organizationId: String(organizationId),
        });
        orgSlug = '';
      }
      if (!orgSlug) return createErrorResponse(new Error('Missing organization slug'), 'לא נמצא מזהה ארגון');

      const fileName = `subscription-proof-${parsed.data.orderId}`;
      const upload = await uploadFile(parsed.data.proofFile, fileName, 'media', orgSlug);
      if (!upload.success || !upload.url || !upload.path) {
        return createErrorResponse(new Error(upload.error || 'Upload failed'), upload.error || 'שגיאה בהעלאת הוכחה');
      }
      proof = { url: upload.url, path: upload.path };
    }

    try {
      if (actor.isSuperAdmin) {
        await withTenantIsolationContext(
          { source: 'app/actions/subscription-orders.submitSubscriptionPaymentProof', mode: 'global_admin', isSuperAdmin: true },
          async () =>
            prisma.subscription_orders.update({
              where: { id: orderId },
              data: {
                status: 'pending_verification',
                pending_verification_at: now,
                proof_image_url: proof.url || null,
                proof_image_path: proof.path || null,
                updated_at: now,
              },
            })
        );
      } else {
        const scopedOrgId = orderOrganizationId ? String(orderOrganizationId) : '';
        if (!scopedOrgId) {
          return createErrorResponse(new Error('Missing organization'), 'חסרה חברה להזמנה');
        }

        const updated = await prisma.subscription_orders.updateMany({
          where: { id: orderId, organization_id: scopedOrgId },
          data: {
            status: 'pending_verification',
            pending_verification_at: now,
            proof_image_url: proof.url || null,
            proof_image_path: proof.path || null,
            updated_at: now,
          },
        });

        if (!updated || updated.count < 1) {
          return createErrorResponse(new Error('Update failed'), 'שגיאה בעדכון הזמנה');
        }
      }
    } catch (updateError: unknown) {
      captureActionException(updateError, { action: 'submitSubscriptionPaymentProof', stage: 'update_order', orderId });
      return createErrorResponse(updateError, 'שגיאה בעדכון הזמנה');
    }

    return createSuccessResponse(proof);
  } catch (error: unknown) {
    captureActionException(error, { action: 'submitSubscriptionPaymentProof', stage: 'outer' });
    return createErrorResponse(error, 'שגיאה בשליחת הוכחת תשלום');
  }
}
