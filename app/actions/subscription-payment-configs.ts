'use server';

import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import type { PackageType } from '@/lib/server/workspace';

type PaymentConfig = {
  package_type: PackageType;
  title: string | null;
  qr_image_url: string | null;
  instructions_text: string | null;
  payment_method: 'manual' | 'automatic' | null;
  external_payment_url: string | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizePaymentMethod(value: unknown): PaymentConfig['payment_method'] {
  const v = String(value ?? '').toLowerCase();
  if (v === 'manual' || v === 'automatic') return v;
  return null;
}

async function requireSuperAdmin(): Promise<{ success: true } | { success: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) {
    return { success: false, error: authCheck.error || 'נדרשת התחברות' };
  }

  const user = await getAuthenticatedUser();
  if (!user?.isSuperAdmin) {
    return { success: false, error: 'אין הרשאה (נדרש Super Admin)' };
  }

  return { success: true };
}

export async function getSubscriptionPaymentConfigs(): Promise<{
  success: boolean;
  data?: PaymentConfig[];
  error?: string;
}> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const rows = await prisma.subscription_payment_configs.findMany({
      select: {
        package_type: true,
        title: true,
        qr_image_url: true,
        instructions_text: true,
        payment_method: true,
        external_payment_url: true,
      },
      orderBy: { package_type: 'asc' },
    });

    const mapped: PaymentConfig[] = (Array.isArray(rows) ? rows : []).map((r: any) => {
      const obj = asObject(r) ?? {};
      return {
        package_type: String(obj.package_type ?? '') as PackageType,
        title: obj.title == null ? null : String(obj.title),
        qr_image_url: obj.qr_image_url == null ? null : String(obj.qr_image_url),
        instructions_text: obj.instructions_text == null ? null : String(obj.instructions_text),
        payment_method: normalizePaymentMethod(obj.payment_method),
        external_payment_url: obj.external_payment_url == null ? null : String(obj.external_payment_url),
      };
    });

    return createSuccessResponse(mapped);
  } catch (e) {
    return createErrorResponse(e, 'שגיאה בטעינת הגדרות תשלום');
  }
}

export async function upsertSubscriptionPaymentConfig(input: {
  packageType: PackageType;
  title?: string;
  qrImageUrl?: string;
  instructionsText?: string;
  paymentMethod?: 'manual' | 'automatic';
  externalPaymentUrl?: string;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const now = new Date();

    const createData: any = {
      package_type: String(input.packageType),
      title: input.title !== undefined ? String(input.title).trim() : null,
      qr_image_url: input.qrImageUrl !== undefined ? String(input.qrImageUrl).trim() : null,
      instructions_text: input.instructionsText !== undefined ? String(input.instructionsText).trim() : null,
      payment_method: input.paymentMethod !== undefined ? input.paymentMethod : null,
      external_payment_url: input.externalPaymentUrl !== undefined ? String(input.externalPaymentUrl).trim() : null,
      updated_at: now,
    };

    const updateData: any = {
      title: input.title !== undefined ? String(input.title).trim() : undefined,
      qr_image_url: input.qrImageUrl !== undefined ? String(input.qrImageUrl).trim() : undefined,
      instructions_text: input.instructionsText !== undefined ? String(input.instructionsText).trim() : undefined,
      payment_method: input.paymentMethod !== undefined ? input.paymentMethod : undefined,
      external_payment_url: input.externalPaymentUrl !== undefined ? String(input.externalPaymentUrl).trim() : undefined,
      updated_at: now,
    };

    await prisma.subscription_payment_configs.upsert({
      where: { package_type: String(input.packageType) },
      create: createData,
      update: updateData,
    });

    return createSuccessResponse(true);
  } catch (e) {
    return createErrorResponse(e, 'שגיאה בשמירת הגדרות תשלום');
  }
}

export async function getSubscriptionPaymentConfigForCheckout(input: {
  packageType: PackageType;
}): Promise<{ success: boolean; data?: PaymentConfig | null; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const data = await prisma.subscription_payment_configs.findUnique({
      where: { package_type: String(input.packageType) },
      select: {
        package_type: true,
        title: true,
        qr_image_url: true,
        instructions_text: true,
        payment_method: true,
        external_payment_url: true,
      },
    });

    if (!data) return createSuccessResponse(null);
    const obj = asObject(data) ?? {};
    return createSuccessResponse({
      package_type: String(obj.package_type ?? input.packageType) as PackageType,
      title: obj.title == null ? null : String(obj.title),
      qr_image_url: obj.qr_image_url == null ? null : String(obj.qr_image_url),
      instructions_text: obj.instructions_text == null ? null : String(obj.instructions_text),
      payment_method: normalizePaymentMethod(obj.payment_method),
      external_payment_url: obj.external_payment_url == null ? null : String(obj.external_payment_url),
    });
  } catch (e) {
    return createErrorResponse(e, 'שגיאה בטעינת פרטי תשלום');
  }
}
