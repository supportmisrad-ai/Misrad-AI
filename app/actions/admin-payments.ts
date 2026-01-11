'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

/**
 * Get all payments (admin view)
 */
export async function getAllPayments(): Promise<{
  success: boolean;
  data?: {
    paymentOrders: any[];
    invoices: any[];
    subscriptionOrders: any[];
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Get all payment orders
    const { data: paymentOrders, error: ordersError } = await supabase
      .from('payment_orders')
      .select(`
        *,
        clients (
          id,
          company_name,
          email,
          avatar
        )
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return createErrorResponse(ordersError, 'שגיאה בטעינת תשלומים');
    }

    // Get all invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          id,
          company_name,
          email,
          avatar
        )
      `)
      .order('created_at', { ascending: false });

    if (invoicesError) {
      console.warn('[getAllPayments] Error loading invoices:', invoicesError);
    }

    // Get all subscription orders (manual Bit flow)
    const { data: subscriptionOrders, error: subscriptionOrdersError } = await supabase
      .from('subscription_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (subscriptionOrdersError) {
      console.warn('[getAllPayments] Error loading subscription_orders:', subscriptionOrdersError);
    }

    return createSuccessResponse({
      paymentOrders: paymentOrders || [],
      invoices: invoices || [],
      subscriptionOrders: subscriptionOrders || [],
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת תשלומים');
  }
}

/**
 * Update payment order status
 */
export async function updatePaymentOrderStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const { error } = await supabase
      .from('payment_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      return createErrorResponse(error, 'שגיאה בעדכון סטטוס תשלום');
    }

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `עדכון סטטוס תשלום: ${orderId} ל-${status}`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון סטטוס תשלום');
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'paid' | 'pending' | 'overdue'
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId);

    if (error) {
      return createErrorResponse(error, 'שגיאה בעדכון סטטוס חשבונית');
    }

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `עדכון סטטוס חשבונית: ${invoiceId} ל-${status}`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון סטטוס חשבונית');
  }
}

