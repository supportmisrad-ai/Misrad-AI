'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { randomUUID } from 'crypto';
import type { PackageType } from '@/lib/server/workspace';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { uploadFile } from '@/app/actions/files';
import { calculateOrderAmount } from '@/lib/billing/pricing';
import prisma from '@/lib/prisma';

export type SubscriptionOrderStatus = 'pending' | 'pending_verification' | 'paid' | 'cancelled';
export type BillingCycle = 'monthly' | 'yearly';

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

function getUnknownErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : null;
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

export type CreateSubscriptionOrderInput = {
  organizationId?: string;
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
};

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
      ? await prisma.social_users.findUnique({
          where: { clerk_user_id: String(clerkUserId) },
          select: { id: true, organization_id: true },
        })
      : null;

    const id = randomUUID();
    const now = new Date();

    const userOrganizationId = socialUser?.organization_id || null;
    if (input.organizationId && input.organizationId !== userOrganizationId) {
      return createErrorResponse(null, 'אין הרשאה');
    }

    const organizationId = userOrganizationId || null;

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
    } catch (error) {
      const errorMessage = getUnknownErrorMessage(error);
      return createErrorResponse(error, errorMessage || 'שגיאה בחישוב מחיר');
    }

    const createData: Record<string, unknown> = {
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
    };

    if (seats) createData.seats = seats;

    try {
      await prisma.subscription_orders.create({ data: createData as any });
    } catch (error: unknown) {
      if (seats && isMissingColumnError(error, 'seats')) {
        try {
          delete (createData as any).seats;
          await prisma.subscription_orders.create({ data: createData as any });
        } catch (retryError: unknown) {
          return createErrorResponse(retryError, 'שגיאה ביצירת הזמנת מנוי');
        }
      } else {
        return createErrorResponse(error, 'שגיאה ביצירת הזמנת מנוי');
      }
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
      } catch {
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
        } catch {
          partnerId = null;
        }
      }

      if (!partnerId) {
        return createErrorResponse(null, 'קוד שותף לא נמצא');
      }

      if (organizationId) {
        try {
          await prisma.social_organizations.updateMany({
            where: { id: organizationId },
            data: { partnerId: partnerId } as any,
          });
        } catch (error) {
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
      amount: Number(calculatedAmount) || 0,
      currency: String(input.currency || 'ILS'),
      status: 'pending',
      paymentMethod: 'bit',
      createdAt: now.toISOString(),
    };

    return createSuccessResponse(order);
  } catch (error) {
    const errorMessage = getUnknownErrorMessage(error);
    return createErrorResponse(error, errorMessage || 'שגיאה ביצירת הזמנת מנוי');
  }
}

export async function getSubscriptionOrder(
  orderId: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const id = String(orderId || '').trim();
    if (!id) return createErrorResponse('Missing orderId', 'שגיאה בטעינת הזמנת מנוי');

    const row = await prisma.subscription_orders.findFirst({
      where: { id },
    });

    if (!row) {
      return createErrorResponse('Not found', 'שגיאה בטעינת הזמנת מנוי');
    }

    return createSuccessResponse(row as any);
  } catch (error) {
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
  } catch (error) {
    const errorMessage = getUnknownErrorMessage(error);
    return createErrorResponse(error, errorMessage || 'שגיאה בטעינת הגדרות תשלום');
  }
}

export async function submitSubscriptionPaymentProof(input: {
  orderId: string;
  proofFile?: File | null;
}): Promise<{ success: boolean; data?: { url?: string; path?: string } ; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const orderId = String(input.orderId || '').trim();
    if (!orderId) {
      return createErrorResponse('Missing orderId', 'שגיאה בטעינת הזמנה');
    }

    const order = await prisma.subscription_orders.findFirst({
      where: { id: orderId },
      select: { id: true, clerk_user_id: true, status: true },
    });

    if (!order?.id) {
      return createErrorResponse(new Error('Order not found'), 'הזמנה לא נמצאה');
    }

    if (order.clerk_user_id && authCheck.userId && order.clerk_user_id !== authCheck.userId) {
      return createErrorResponse(new Error('Forbidden'), 'אין הרשאה לעדכן הזמנה זו');
    }

    const now = new Date();

    let proof: { url?: string; path?: string } = {};
    if (input.proofFile) {
      const fileName = `subscription-proof-${input.orderId}`;
      const upload = await uploadFile(input.proofFile, fileName, 'media');
      if (!upload.success || !upload.url || !upload.path) {
        return createErrorResponse(new Error(upload.error || 'Upload failed'), upload.error || 'שגיאה בהעלאת הוכחה');
      }
      proof = { url: upload.url, path: upload.path };
    }

    try {
      await prisma.subscription_orders.update({
        where: { id: orderId },
        data: {
          status: 'pending_verification',
          pending_verification_at: now,
          proof_image_url: proof.url || null,
          proof_image_path: proof.path || null,
          updated_at: now,
        },
      });
    } catch (updateError) {
      return createErrorResponse(updateError, 'שגיאה בעדכון הזמנה');
    }

    return createSuccessResponse(proof);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשליחת הוכחת תשלום');
  }
}
