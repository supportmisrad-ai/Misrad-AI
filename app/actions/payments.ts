'use server';

import { createClient as createSupabaseClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { PaymentOrder } from '@/types/social';
import type { Invoice as FinanceInvoice } from '@/types/finance';
import { randomUUID } from 'crypto';
import { updateClinicClient } from '@/app/actions/client-clinic';

/**
 * Create a payment order
 */
export async function createPaymentOrder(
  clientId: string,
  amount: number,
  description: string,
  installmentsAllowed: 1 | 2 = 1
): Promise<{ success: boolean; data?: PaymentOrder; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return createErrorResponse(null, 'Supabase לא מוגדר');
    }

    const paymentOrder: PaymentOrder = {
      id: randomUUID(),
      clientId,
      amount,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      installmentsAllowed,
    };

    // Save payment order to database
    const { error } = await supabase
      .from('payment_orders')
      .insert({
        id: paymentOrder.id,
        client_id: clientId,
        amount: amount,
        description: description,
        status: 'pending',
        installments_allowed: installmentsAllowed,
        created_at: paymentOrder.createdAt,
      });

    if (error) {
      console.error('[createPaymentOrder] Database error:', error);
      return createErrorResponse(error, 'שגיאה ביצירת הזמנת תשלום');
    }

    return createSuccessResponse(paymentOrder);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה ביצירת הזמנת תשלום');
  }
}

/**
 * Process payment (simulate payment gateway)
 * In production, this would integrate with Stripe/PayPal/etc.
 */
export async function processPayment(
  paymentOrderId: string,
  cardNumber: string,
  expiryDate: string,
  cvv: string,
  installments: 1 | 2 = 1
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return createErrorResponse(null, 'Supabase לא מוגדר');
    }

    // Get payment order
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', paymentOrderId)
      .single();

    if (orderError || !order) {
      return createErrorResponse(orderError, 'הזמנת תשלום לא נמצאה');
    }

    // Validate card (basic validation)
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      return createErrorResponse(null, 'מספר כרטיס לא תקין');
    }

    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
      return createErrorResponse(null, 'תאריך תפוגה לא תקין');
    }

    if (!cvv || cvv.length < 3 || cvv.length > 4) {
      return createErrorResponse(null, 'CVV לא תקין');
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate installment amount
    const installmentAmount = order.amount / installments;

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: randomUUID(),
        payment_order_id: paymentOrderId,
        client_id: order.client_id,
        amount: installmentAmount,
        total_amount: order.amount,
        installments: installments,
        transaction_id: transactionId,
        status: 'completed',
        payment_method: 'credit_card',
        created_at: new Date().toISOString(),
      });

    if (paymentError) {
      console.error('[processPayment] Database error:', paymentError);
      return createErrorResponse(paymentError, 'שגיאה בעיבוד התשלום');
    }

    // Update payment order status
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({ status: 'paid' })
      .eq('id', paymentOrderId);

    if (updateError) {
      console.error('[processPayment] Update error:', updateError);
    }

    // Update client payment status
    try {
      const { data: clientRow } = await supabase
        .from('client_clients')
        .select('id, organization_id, metadata')
        .eq('id', order.client_id)
        .maybeSingle();

      if (clientRow?.id) {
        const nextMetadata = {
          ...(clientRow as any).metadata,
          paymentStatus: 'paid',
          lastPaymentDate: new Date().toISOString(),
        };
        await updateClinicClient({
          orgId: String((clientRow as any).organization_id),
          clientId: String((clientRow as any).id),
          updates: { metadata: nextMetadata },
        });
      }
    } catch (e) {
      console.error('[processPayment] Client update error:', e);
    }

    // Create invoice
    await createInvoice(order.client_id, order.amount, order.description, transactionId);

    return createSuccessResponse({ transactionId });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעיבוד התשלום');
  }
}

/**
 * Create invoice after payment
 */
async function createInvoice(
  clientId: string,
  amount: number,
  description: string,
  transactionId: string
): Promise<void> {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const invoiceId = randomUUID();
    const invoiceNumber = `INV-${Date.now()}`;

    await supabase
      .from('invoices')
      .insert({
        id: invoiceId,
        client_id: clientId,
        invoice_number: invoiceNumber,
        amount: amount,
        description: description,
        status: 'paid',
        transaction_id: transactionId,
        issue_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        paid_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('[createInvoice] Error:', error);
  }
}

/**
 * Get invoices for a client
 */
export async function getInvoices(clientId: string): Promise<{ success: boolean; data?: FinanceInvoice[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return createErrorResponse(null, 'Supabase לא מוגדר');
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת חשבוניות');
    }

    const invoices: FinanceInvoice[] = (data || []).map((inv: any) => ({
      id: inv.id,
      number: inv.invoice_number ?? inv.number ?? String(inv.id).slice(0, 8),
      clientName: inv.client_name ?? '',
      clientEmail: inv.client_email ?? undefined,
      amount: Number(inv.amount) || 0,
      currency: inv.currency ?? 'ILS',
      status: (inv.status as any) ?? 'paid',
      issueDate: inv.issue_date ? new Date(inv.issue_date) : new Date(),
      dueDate: inv.due_date ? new Date(inv.due_date) : new Date(),
      paidDate: inv.paid_date ? new Date(inv.paid_date) : undefined,
      description: inv.description ?? undefined,
      url: `/api/invoices/${inv.id}/download`,
    }));

    return createSuccessResponse(invoices);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת חשבוניות');
  }
}

/**
 * Get payment history for a client
 */
export async function getPaymentHistory(clientId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return createErrorResponse(null, 'Supabase לא מוגדר');
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת היסטוריית תשלומים');
    }

    return createSuccessResponse(data || []);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת היסטוריית תשלומים');
  }
}

