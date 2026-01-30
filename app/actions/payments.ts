'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { PaymentOrder } from '@/types/social';
import type { Invoice as FinanceInvoice } from '@/types/finance';
import type { InvoiceStatus } from '@/types/finance';
import { randomUUID } from 'crypto';
import { updateClinicClient } from '@/app/actions/client-clinic';
import prisma, { queryRawOrgScoped, executeRawOrgScoped } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return asObject(value);
}

function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return (
    value === 'draft' ||
    value === 'sent' ||
    value === 'paid' ||
    value === 'overdue' ||
    value === 'cancelled' ||
    value === 'refunded'
  );
}

async function requireCurrentOrganizationId(clerkUserId: string): Promise<string> {
  const resolvedClerkUserId = String(clerkUserId || '').trim();
  if (!resolvedClerkUserId) {
    throw new Error('Not authenticated');
  }

  const profile = await prisma.profile.findFirst({
    where: { clerkUserId: resolvedClerkUserId },
    select: { organizationId: true },
  });

  const organizationId = String(profile?.organizationId || '').trim();
  if (!organizationId) {
    throw new Error('Missing organizationId');
  }

  return organizationId;
}

async function assertClientInOrganization(params: { organizationId: string; clientId: string }): Promise<void> {
  const organizationId = String(params.organizationId || '').trim();
  const clientId = String(params.clientId || '').trim();
  if (!organizationId || !clientId) throw new Error('Missing clientId');

  const exists = await prisma.clients.findFirst({
    where: {
      id: clientId,
      organization_id: organizationId,
      deleted_at: null,
    } as any,
    select: { id: true },
  });

  if (!exists?.id) {
    throw new Error('אין הרשאה ללקוח המבוקש');
  }
}

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
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    const organizationId = await requireCurrentOrganizationId(String(authCheck.userId));
    await assertClientInOrganization({ organizationId, clientId });

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
    await prisma.social_payment_orders.create({
      data: {
        id: paymentOrder.id,
        client_id: clientId,
        amount: new Prisma.Decimal(amount),
        description: description,
        status: 'pending',
        installments_allowed: installmentsAllowed,
        created_at: new Date(paymentOrder.createdAt),
        updated_at: new Date(paymentOrder.createdAt),
      },
      select: { id: true },
    });

    return createSuccessResponse(paymentOrder);
  } catch (error: unknown) {
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
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    const organizationId = await requireCurrentOrganizationId(String(authCheck.userId));

    // Get payment order
    const order = await prisma.social_payment_orders.findUnique({
      where: { id: String(paymentOrderId) },
      select: {
        id: true,
        client_id: true,
        amount: true,
        description: true,
        installments_allowed: true,
        status: true,
      },
    });

    if (!order?.id) {
      return createErrorResponse(null, 'הזמנת תשלום לא נמצאה');
    }

    await assertClientInOrganization({ organizationId, clientId: String(order.client_id) });

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
    const totalAmount = Number((order as any).amount) || 0;
    const installmentAmount = totalAmount / installments;

    if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) {
      return createErrorResponse(null, 'סכום תשלום לא תקין');
    }

    // Create payment record
    const paymentId = randomUUID();
    const paymentCreatedAt = new Date().toISOString();
    const insertedPayments = await executeRawOrgScoped(prisma, {
      organizationId,
      reason: 'payments_insert_payment',
      query: `
        insert into payments (
          id,
          payment_order_id,
          client_id,
          amount,
          total_amount,
          installments,
          transaction_id,
          status,
          payment_method,
          created_at
        )
        select
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10
        where exists (
          select 1
          from clients c
          where c.id = $3
            and c.organization_id = $11
        )
      `,
      values: [
        paymentId,
        String(paymentOrderId),
        String(order.client_id),
        installmentAmount,
        totalAmount,
        installments,
        transactionId,
        'completed',
        'credit_card',
        paymentCreatedAt,
        organizationId,
      ],
    });

    if (!insertedPayments) {
      return createErrorResponse(null, 'שגיאה בעיבוד התשלום');
    }

    // Update payment order status
    try {
      await prisma.social_payment_orders.update({
        where: { id: String(paymentOrderId) },
        data: { status: 'paid', updated_at: new Date() },
      });
    } catch (e: unknown) {
      console.error('[processPayment] Update error:', e);
    }

    // Update client payment status
    try {
      const clientRow = await prisma.clientClient.findFirst({
        where: { id: String(order.client_id) },
        select: { id: true, organizationId: true, metadata: true },
      });

      const clientIdVal = String((clientRow as any)?.id ?? '').trim();
      const orgIdVal = String((clientRow as any)?.organizationId ?? '').trim();
      if (clientIdVal && orgIdVal) {
        const existingMeta = asRecord((clientRow as any)?.metadata) ?? {};
        const nextMetadata = {
          ...existingMeta,
          paymentStatus: 'paid',
          lastPaymentDate: new Date().toISOString(),
        };
        await updateClinicClient({
          orgId: orgIdVal,
          clientId: clientIdVal,
          updates: { metadata: nextMetadata },
        });
      }
    } catch (e: unknown) {
      console.error('[processPayment] Client update error:', e);
    }

    // Create invoice
    await createInvoice(String(order.client_id), totalAmount, String(order.description || ''), transactionId, organizationId);

    return createSuccessResponse({ transactionId });
  } catch (error: unknown) {
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
  transactionId: string,
  organizationId: string
): Promise<void> {
  try {
    const invoiceId = randomUUID();
    const invoiceNumber = `INV-${Date.now()}`;

    await executeRawOrgScoped(prisma, {
      organizationId,
      reason: 'payments_create_invoice',
      query: `
        insert into invoices (
          id,
          client_id,
          invoice_number,
          amount,
          description,
          status,
          transaction_id,
          issue_date,
          due_date,
          paid_date,
          created_at
        )
        select
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11
        where exists (
          select 1
          from clients c
          where c.id = $2
            and c.organization_id = $12
        )
      `,
      values: [
        invoiceId,
        String(clientId),
        invoiceNumber,
        amount,
        description,
        'paid',
        transactionId,
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
        organizationId,
      ],
    });
  } catch (error: unknown) {
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
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    const organizationId = await requireCurrentOrganizationId(String(authCheck.userId));
    await assertClientInOrganization({ organizationId, clientId });

    const data = await queryRawOrgScoped<unknown[]>(prisma, {
      organizationId,
      reason: 'payments_get_invoices',
      query: `
        select i.*
        from invoices i
        join clients c on c.id = i.client_id
        where i.client_id = $1
          and c.organization_id = $2
        order by i.created_at desc
      `,
      values: [String(clientId), organizationId],
    });

    const list: unknown[] = Array.isArray(data) ? data : [];
    const invoices: FinanceInvoice[] = list.map((inv) => {
      const obj = asObject(inv) ?? {};
      const id = String(obj.id ?? '');
      const number = String(obj.invoice_number ?? obj.number ?? id.slice(0, 8));
      const status = isInvoiceStatus(obj.status) ? obj.status : 'paid';

      return {
        id,
        number,
        clientName: String(obj.client_name ?? ''),
        clientEmail: obj.client_email == null ? undefined : String(obj.client_email),
        amount: Number(obj.amount) || 0,
        currency: String(obj.currency ?? 'ILS'),
        status,
        issueDate: obj.issue_date ? new Date(String(obj.issue_date)) : new Date(),
        dueDate: obj.due_date ? new Date(String(obj.due_date)) : new Date(),
        paidDate: obj.paid_date ? new Date(String(obj.paid_date)) : undefined,
        description: obj.description == null ? undefined : String(obj.description),
        url: `/api/invoices/${id}/download`,
      };
    });

    return createSuccessResponse(invoices);
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת חשבוניות');
  }
}

/**
 * Get payment history for a client
 */
export async function getPaymentHistory(clientId: string): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    const organizationId = await requireCurrentOrganizationId(String(authCheck.userId));
    await assertClientInOrganization({ organizationId, clientId });

    const data = await queryRawOrgScoped<unknown[]>(prisma, {
      organizationId,
      reason: 'payments_get_history',
      query: `
        select p.*
        from payments p
        join clients c on c.id = p.client_id
        where p.client_id = $1
          and c.organization_id = $2
        order by p.created_at desc
        limit 50
      `,
      values: [String(clientId), organizationId],
    });

    const list: unknown[] = Array.isArray(data) ? data : [];
    return createSuccessResponse(list);
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת היסטוריית תשלומים');
  }
}

