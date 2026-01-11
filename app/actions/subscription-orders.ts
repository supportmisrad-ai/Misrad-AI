'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { randomUUID } from 'crypto';
import type { PackageType } from '@/lib/server/workspace';
import { uploadFile } from '@/app/actions/files';

export type SubscriptionOrderStatus = 'pending' | 'pending_verification' | 'paid' | 'cancelled';
export type BillingCycle = 'monthly' | 'yearly';

export type CreateSubscriptionOrderInput = {
  organizationId?: string;
  packageType?: PackageType;
  planKey?: string;
  billingCycle: BillingCycle;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
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
    if (!authCheck.success) return authCheck as any;

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

    const supabase = createClient();

    const { data: socialUser } = await supabase
      .from('social_users')
      .select('id, organization_id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    const id = randomUUID();
    const now = new Date().toISOString();

    const organizationId = input.organizationId || socialUser?.organization_id || null;

    const insertPayload: any = {
      id,
      clerk_user_id: clerkUserId,
      social_user_id: socialUser?.id || null,
      organization_id: organizationId,
      package_type: input.packageType || null,
      plan_key: input.planKey || null,
      billing_cycle: input.billingCycle,
      amount: input.amount,
      currency: input.currency || 'ILS',
      status: 'pending',
      payment_method: 'bit',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase
      .from('subscription_orders')
      .insert(insertPayload);

    if (error) {
      return createErrorResponse(error, 'שגיאה ביצירת הזמנת מנוי');
    }

    const order: SubscriptionOrder = {
      id,
      clerkUserId,
      socialUserId: socialUser?.id || null,
      organizationId,
      packageType: insertPayload.package_type,
      planKey: insertPayload.plan_key,
      billingCycle: input.billingCycle,
      amount: Number(input.amount) || 0,
      currency: insertPayload.currency,
      status: 'pending',
      paymentMethod: 'bit',
      createdAt: now,
    };

    return createSuccessResponse(order);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה ביצירת הזמנת מנוי');
  }
}

export async function getSubscriptionOrder(
  orderId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return authCheck as any;

    const supabase = createClient();

    const { data, error } = await supabase
      .from('subscription_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת הזמנת מנוי');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת הזמנת מנוי');
  }
}

export async function getSubscriptionPaymentConfig(
  packageType: PackageType
): Promise<{ success: boolean; data?: SubscriptionPaymentConfig; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return authCheck as any;

    const supabase = createClient();

    const { data, error } = await supabase
      .from('subscription_payment_configs')
      .select('package_type, title, qr_image_url, instructions_text, payment_method, external_payment_url')
      .eq('package_type', packageType)
      .maybeSingle();

    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת הגדרות תשלום');
    }

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
      packageType: data.package_type,
      title: data.title,
      qrImageUrl: data.qr_image_url,
      instructionsText: data.instructions_text,
      paymentMethod: (data as any).payment_method === 'automatic' ? 'automatic' : 'manual',
      externalPaymentUrl: (data as any).external_payment_url || null,
    } satisfies SubscriptionPaymentConfig);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת הגדרות תשלום');
  }
}

export async function submitSubscriptionPaymentProof(input: {
  orderId: string;
  proofFile?: File | null;
}): Promise<{ success: boolean; data?: { url?: string; path?: string } ; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) return authCheck as any;

    const supabase = createClient();

    const { data: order, error: orderError } = await supabase
      .from('subscription_orders')
      .select('id, clerk_user_id, status')
      .eq('id', input.orderId)
      .single();

    if (orderError) {
      return createErrorResponse(orderError, 'שגיאה בטעינת הזמנה');
    }

    if (!order?.id) {
      return createErrorResponse(new Error('Order not found'), 'הזמנה לא נמצאה');
    }

    if (order.clerk_user_id && authCheck.userId && order.clerk_user_id !== authCheck.userId) {
      return createErrorResponse(new Error('Forbidden'), 'אין הרשאה לעדכן הזמנה זו');
    }

    const now = new Date().toISOString();

    let proof: { url?: string; path?: string } = {};
    if (input.proofFile) {
      const fileName = `subscription-proof-${input.orderId}`;
      const upload = await uploadFile(input.proofFile, fileName, 'media');
      if (!upload.success || !upload.url || !upload.path) {
        return createErrorResponse(new Error(upload.error || 'Upload failed'), upload.error || 'שגיאה בהעלאת הוכחה');
      }
      proof = { url: upload.url, path: upload.path };
    }

    const { error: updateError } = await supabase
      .from('subscription_orders')
      .update({
        status: 'pending_verification',
        pending_verification_at: now,
        proof_image_url: proof.url || null,
        proof_image_path: proof.path || null,
        updated_at: now,
      })
      .eq('id', input.orderId);

    if (updateError) {
      return createErrorResponse(updateError, 'שגיאה בעדכון הזמנה');
    }

    return createSuccessResponse(proof);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשליחת הוכחת תשלום');
  }
}
