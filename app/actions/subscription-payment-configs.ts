'use server';

import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import type { PackageType } from '@/lib/server/workspace';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

import { asObjectLoose as asObject } from '@/lib/shared/unknown';
type PaymentConfig = {
  package_type: PackageType;
  title: string | null;
  qr_image_url: string | null;
  instructions_text: string | null;
  payment_method: 'manual' | 'automatic' | null;
  external_payment_url: string | null;
};

function normalizePaymentMethod(value: unknown): PaymentConfig['payment_method'] {
  const v = String(value ?? '').toLowerCase();
  if (v === 'manual' || v === 'automatic') return v;
  return null;
}

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'subscription_payment_configs');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

const PackageTypeSchema = z.string().min(1);

const UpsertPaymentConfigSchema = z.object({
  packageType: PackageTypeSchema,
  title: z.string().optional(),
  qrImageUrl: z.string().optional(),
  instructionsText: z.string().optional(),
  paymentMethod: z.enum(['manual', 'automatic']).optional(),
  externalPaymentUrl: z.string().optional(),
});

const GetPaymentConfigSchema = z.object({
  packageType: PackageTypeSchema,
});

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

    const mapped: PaymentConfig[] = (Array.isArray(rows) ? rows : []).map((r) => {
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
  } catch (e: unknown) {
    captureActionException(e, { action: 'getSubscriptionPaymentConfigs' });
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
    const parsed = UpsertPaymentConfigSchema.safeParse(input);
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'upsertSubscriptionPaymentConfig', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין');
    }

    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const now = new Date();

    type UpsertArgs = Parameters<typeof prisma.subscription_payment_configs.upsert>[0];
    type CreateData = UpsertArgs['create'];
    type UpdateData = UpsertArgs['update'];

    const createData: CreateData = {
      package_type: String(parsed.data.packageType),
      title: parsed.data.title !== undefined ? String(parsed.data.title).trim() : null,
      qr_image_url: parsed.data.qrImageUrl !== undefined ? String(parsed.data.qrImageUrl).trim() : null,
      instructions_text: parsed.data.instructionsText !== undefined ? String(parsed.data.instructionsText).trim() : null,
      payment_method: parsed.data.paymentMethod !== undefined ? parsed.data.paymentMethod : null,
      external_payment_url: parsed.data.externalPaymentUrl !== undefined ? String(parsed.data.externalPaymentUrl).trim() : null,
      updated_at: now,
    };

    const updateData: UpdateData = {
      title: parsed.data.title !== undefined ? String(parsed.data.title).trim() : undefined,
      qr_image_url: parsed.data.qrImageUrl !== undefined ? String(parsed.data.qrImageUrl).trim() : undefined,
      instructions_text: parsed.data.instructionsText !== undefined ? String(parsed.data.instructionsText).trim() : undefined,
      payment_method: parsed.data.paymentMethod !== undefined ? parsed.data.paymentMethod : undefined,
      external_payment_url: parsed.data.externalPaymentUrl !== undefined ? String(parsed.data.externalPaymentUrl).trim() : undefined,
      updated_at: now,
    };

    await prisma.subscription_payment_configs.upsert({
      where: { package_type: String(parsed.data.packageType) },
      create: createData,
      update: updateData,
    });

    return createSuccessResponse(true);
  } catch (e: unknown) {
    captureActionException(e, { action: 'upsertSubscriptionPaymentConfig' });
    return createErrorResponse(e, 'שגיאה בשמירת הגדרות תשלום');
  }
}

export async function getSubscriptionPaymentConfigForCheckout(input: {
  packageType: PackageType;
}): Promise<{ success: boolean; data?: PaymentConfig | null; error?: string }> {
  try {
    const parsed = GetPaymentConfigSchema.safeParse(input);
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'getSubscriptionPaymentConfigForCheckout', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין');
    }

    const authCheck = await requireAuth();
    if (!authCheck.success) return { success: false, error: authCheck.error || 'נדרשת התחברות' };

    const data = await prisma.subscription_payment_configs.findUnique({
      where: { package_type: String(parsed.data.packageType) },
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
      package_type: String(obj.package_type ?? parsed.data.packageType) as PackageType,
      title: obj.title == null ? null : String(obj.title),
      qr_image_url: obj.qr_image_url == null ? null : String(obj.qr_image_url),
      instructions_text: obj.instructions_text == null ? null : String(obj.instructions_text),
      payment_method: normalizePaymentMethod(obj.payment_method),
      external_payment_url: obj.external_payment_url == null ? null : String(obj.external_payment_url),
    });
  } catch (e: unknown) {
    captureActionException(e, { action: 'getSubscriptionPaymentConfigForCheckout' });
    return createErrorResponse(e, 'שגיאה בטעינת פרטי תשלום');
  }
}
