'use server';

import { createClient } from '@/lib/supabase';
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

    const supabase = createClient();
    const { data, error } = await supabase
      .from('subscription_payment_configs')
      .select('package_type, title, qr_image_url, instructions_text, payment_method, external_payment_url')
      .order('package_type', { ascending: true });

    if (error) return createErrorResponse(error, 'שגיאה בטעינת הגדרות תשלום');

    return createSuccessResponse((data || []) as any);
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

    const supabase = createClient();
    const now = new Date().toISOString();

    const payload: any = {
      package_type: input.packageType,
      title: input.title !== undefined ? String(input.title).trim() : null,
      qr_image_url: input.qrImageUrl !== undefined ? String(input.qrImageUrl).trim() : null,
      instructions_text: input.instructionsText !== undefined ? String(input.instructionsText).trim() : null,
      payment_method: input.paymentMethod !== undefined ? input.paymentMethod : undefined,
      external_payment_url: input.externalPaymentUrl !== undefined ? String(input.externalPaymentUrl).trim() : undefined,
      updated_at: now,
    };

    const { error } = await supabase
      .from('subscription_payment_configs')
      .upsert(payload, { onConflict: 'package_type' });

    if (error) return createErrorResponse(error, 'שגיאה בשמירת הגדרות תשלום');

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
    if (!authCheck.success) return authCheck as any;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('subscription_payment_configs')
      .select('package_type, title, qr_image_url, instructions_text, payment_method, external_payment_url')
      .eq('package_type', input.packageType)
      .maybeSingle();

    if (error) return createErrorResponse(error, 'שגיאה בטעינת פרטי תשלום');

    return createSuccessResponse((data as any) || null);
  } catch (e) {
    return createErrorResponse(e, 'שגיאה בטעינת פרטי תשלום');
  }
}
