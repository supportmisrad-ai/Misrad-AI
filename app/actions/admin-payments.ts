'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function logAdminPaymentAction(params: {
  userId: string;
  action: string;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.social_sync_logs.create({
      data: {
        user_id: params.userId,
        integration_name: 'admin_payments',
        sync_type: 'activity',
        status: 'success',
        items_synced: 1,
        error_message: null,
        started_at: new Date(),
        completed_at: new Date(),
        metadata: {
          action: params.action,
          organizationId: params.organizationId ?? null,
          ...(params.metadata || {}),
        },
      },
      select: { id: true },
    });
  } catch {
    // ignore
  }
}

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

    const paymentOrdersRows = await prisma.social_payment_orders.findMany({
      orderBy: { created_at: 'desc' },
    });

    const invoiceRows = await prisma.social_invoices.findMany({
      orderBy: { created_at: 'desc' },
    });

    const subscriptionOrders = await prisma.subscription_orders.findMany({
      orderBy: { created_at: 'desc' },
    });

    const clientIds = Array.from(
      new Set([
        ...paymentOrdersRows.map((r) => String((r as any).client_id || '')),
        ...invoiceRows.map((r) => String((r as any).client_id || '')),
      ].filter(Boolean))
    );

    const clients = clientIds.length
      ? await prisma.clients.findMany({
          where: { id: { in: clientIds } } as any,
          select: { id: true, company_name: true, email: true, avatar: true },
        })
      : [];

    const clientById = new Map<string, { id: string; company_name: string; email: string | null; avatar: string | null }>();
    for (const c of clients) {
      clientById.set(String((c as any).id), {
        id: String((c as any).id),
        company_name: String((c as any).company_name ?? ''),
        email: (c as any).email == null ? null : String((c as any).email),
        avatar: (c as any).avatar == null ? null : String((c as any).avatar),
      });
    }

    const paymentOrders = paymentOrdersRows.map((row) => {
      const clientId = String((row as any).client_id || '');
      return {
        ...(row as any),
        amount: toNumber((row as any).amount),
        clients: clientById.get(clientId) ?? null,
      };
    });

    const invoices = invoiceRows.map((row) => {
      const clientId = String((row as any).client_id || '');
      return {
        ...(row as any),
        amount: toNumber((row as any).amount),
        clients: clientById.get(clientId) ?? null,
      };
    });

    return createSuccessResponse({
      paymentOrders: paymentOrders || [],
      invoices: invoices || [],
      subscriptionOrders: (subscriptionOrders as any[]) || [],
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

    const existing = await prisma.social_payment_orders.findUnique({
      where: { id: String(orderId) },
      select: { id: true, client_id: true },
    });

    if (!existing?.id) {
      return createErrorResponse(new Error('Payment order not found'), 'הזמנה לא נמצאה');
    }

    const clientId = String((existing as any).client_id || '').trim();
    const clientOrg = clientId
      ? await prisma.clients.findFirst({ where: { id: clientId } as any, select: { organization_id: true } })
      : null;
    const organizationId = String((clientOrg as any)?.organization_id || '').trim();
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: להזמנת תשלום אין organization_id');
    }

    await prisma.social_payment_orders.update({
      where: { id: String(orderId) },
      data: { status, updated_at: new Date() },
    });

    await logAdminPaymentAction({
      userId: String(authCheck.userId),
      action: `עדכון סטטוס תשלום: ${orderId} ל-${status}`,
      organizationId,
      metadata: { orderId: String(orderId), status },
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

    const existing = await prisma.social_invoices.findUnique({
      where: { id: String(invoiceId) },
      select: { id: true, client_id: true },
    });

    if (!existing?.id) {
      return createErrorResponse(new Error('Invoice not found'), 'חשבונית לא נמצאה');
    }

    const clientId = String((existing as any).client_id || '').trim();
    const clientOrg = clientId
      ? await prisma.clients.findFirst({ where: { id: clientId } as any, select: { organization_id: true } })
      : null;
    const organizationId = String((clientOrg as any)?.organization_id || '').trim();
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: לחשבונית אין organization_id');
    }

    await prisma.social_invoices.update({
      where: { id: String(invoiceId) },
      data: { status },
    });

    await logAdminPaymentAction({
      userId: String(authCheck.userId),
      action: `עדכון סטטוס חשבונית: ${invoiceId} ל-${status}`,
      organizationId,
      metadata: { invoiceId: String(invoiceId), status },
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון סטטוס חשבונית');
  }
}

