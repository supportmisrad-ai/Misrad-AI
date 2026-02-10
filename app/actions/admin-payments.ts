'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { ActionResult } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

import { asObject } from '@/lib/shared/unknown';
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'admin_payments');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

const UpdatePaymentOrderStatusInputSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(['pending', 'paid', 'cancelled']),
});

const UpdateInvoiceStatusInputSchema = z.object({
  invoiceId: z.string().min(1),
  status: z.enum(['paid', 'pending', 'overdue']),
});

async function logAdminPaymentAction(params: {
  userId: string;
  action: string;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.socialMediaSyncLog.create({
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
  } catch (error: unknown) {
    captureActionException(error, { action: 'logAdminPaymentAction', stage: 'write_log', userId: params.userId });
  }
}

/**
 * Get all payments (admin view)
 */
export async function getAllPayments(): Promise<
  ActionResult<{
    paymentOrders: Array<Record<string, unknown>>;
    invoices: Array<Record<string, unknown>>;
    subscriptionOrders: Array<Record<string, unknown>>;
  }>
> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    const paymentOrdersRows = await prisma.socialMediaPaymentOrder.findMany({
      orderBy: { created_at: 'desc' },
    });

    const invoiceRows = await prisma.socialMediaInvoice.findMany({
      orderBy: { created_at: 'desc' },
    });

    const subscriptionOrders = await prisma.subscription_orders.findMany({
      orderBy: { created_at: 'desc' },
    });

    const clientIds = Array.from(
      new Set([
        ...paymentOrdersRows.map((r) => String(asObject(r)?.client_id || '')),
        ...invoiceRows.map((r) => String(asObject(r)?.client_id || '')),
      ].filter(Boolean))
    );

    const clients = clientIds.length
      ? await prisma.clients.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, company_name: true, email: true, avatar: true },
        })
      : [];

    const clientById = new Map<string, { id: string; company_name: string; email: string | null; avatar: string | null }>();
    for (const c of clients) {
      const cObj = asObject(c) ?? {};
      const id = String(cObj.id ?? '');
      if (!id) continue;
      clientById.set(id, {
        id,
        company_name: String(cObj.company_name ?? ''),
        email: cObj.email == null ? null : String(cObj.email),
        avatar: cObj.avatar == null ? null : String(cObj.avatar),
      });
    }

    const paymentOrders = paymentOrdersRows.map((row) => {
      const rowObj = asObject(row) ?? {};
      const clientId = String(rowObj.client_id || '');
      return {
        ...rowObj,
        amount: toNumber(rowObj.amount),
        clients: clientById.get(clientId) ?? null,
      };
    });

    const invoices = invoiceRows.map((row) => {
      const rowObj = asObject(row) ?? {};
      const clientId = String(rowObj.client_id || '');
      return {
        ...rowObj,
        amount: toNumber(rowObj.amount),
        clients: clientById.get(clientId) ?? null,
      };
    });

    const subscriptionOrdersOut = (Array.isArray(subscriptionOrders) ? subscriptionOrders : []).map(
      (row) => asObject(row) ?? {}
    );

    return createSuccessResponse({
      paymentOrders: paymentOrders || [],
      invoices: invoices || [],
      subscriptionOrders: subscriptionOrdersOut || [],
    });
  } catch (error: unknown) {
    captureActionException(error, { action: 'getAllPayments' });
    return createErrorResponse(error, 'שגיאה בטעינת תשלומים');
  }
}

/**
 * Update payment order status
 */
export async function updatePaymentOrderStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'cancelled'
): Promise<ActionResult<true>> {
  try {
    const parsed = UpdatePaymentOrderStatusInputSchema.safeParse({ orderId, status });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'updatePaymentOrderStatus', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין');
    }

    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    const existing = await prisma.socialMediaPaymentOrder.findUnique({
      where: { id: String(parsed.data.orderId) },
      select: { id: true, client_id: true },
    });

    if (!existing?.id) {
      return createErrorResponse(new Error('Payment order not found'), 'הזמנה לא נמצאה');
    }

    const existingObj = asObject(existing) ?? {};
    const clientId = String(existingObj.client_id || '').trim();
    const clientOrg = clientId
      ? await prisma.clients.findFirst({ where: { id: clientId }, select: { organization_id: true } })
      : null;
    const clientOrgObj = asObject(clientOrg) ?? {};
    const organizationId = String(clientOrgObj.organization_id || '').trim();
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: להזמנת תשלום אין organization_id');
    }

    await prisma.socialMediaPaymentOrder.update({
      where: { id: String(parsed.data.orderId) },
      data: { status: parsed.data.status, updated_at: new Date() },
    });

    await logAdminPaymentAction({
      userId: String(authCheck.userId),
      action: `עדכון סטטוס תשלום: ${parsed.data.orderId} ל-${parsed.data.status}`,
      organizationId,
      metadata: { orderId: String(parsed.data.orderId), status: parsed.data.status },
    });

    return createSuccessResponse(true);
  } catch (error: unknown) {
    captureActionException(error, { action: 'updatePaymentOrderStatus', orderId: String(orderId) });
    return createErrorResponse(error, 'שגיאה בעדכון סטטוס תשלום');
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'paid' | 'pending' | 'overdue'
): Promise<ActionResult<true>> {
  try {
    const parsed = UpdateInvoiceStatusInputSchema.safeParse({ invoiceId, status });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'updateInvoiceStatus', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין');
    }

    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    const existing = await prisma.socialMediaInvoice.findUnique({
      where: { id: String(parsed.data.invoiceId) },
      select: { id: true, client_id: true },
    });

    if (!existing?.id) {
      return createErrorResponse(new Error('Invoice not found'), 'חשבונית לא נמצאה');
    }

    const existingObj = asObject(existing) ?? {};
    const clientId = String(existingObj.client_id || '').trim();
    const clientOrg = clientId
      ? await prisma.clients.findFirst({ where: { id: clientId }, select: { organization_id: true } })
      : null;
    const clientOrgObj = asObject(clientOrg) ?? {};
    const organizationId = String(clientOrgObj.organization_id || '').trim();
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: לחשבונית אין organization_id');
    }

    await prisma.socialMediaInvoice.update({
      where: { id: String(parsed.data.invoiceId) },
      data: { status: parsed.data.status },
    });

    await logAdminPaymentAction({
      userId: String(authCheck.userId),
      action: `עדכון סטטוס חשבונית: ${parsed.data.invoiceId} ל-${parsed.data.status}`,
      organizationId,
      metadata: { invoiceId: String(parsed.data.invoiceId), status: parsed.data.status },
    });

    return createSuccessResponse(true);
  } catch (error: unknown) {
    captureActionException(error, { action: 'updateInvoiceStatus', invoiceId: String(invoiceId) });
    return createErrorResponse(error, 'שגיאה בעדכון סטטוס חשבונית');
  }
}

