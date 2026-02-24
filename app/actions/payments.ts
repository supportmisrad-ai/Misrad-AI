'use server';


import { revalidatePath } from 'next/cache';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { PaymentOrder } from '@/types/social';
import type { Invoice as FinanceInvoice } from '@/types/finance';
import type { InvoiceStatus } from '@/types/finance';
import { randomUUID } from 'crypto';
import { updateClinicClient } from '@/app/actions/client-clinic';
import prisma, { queryRawOrgScoped, executeRawOrgScoped } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';


import { asObject } from '@/lib/shared/unknown';
import { insertMisradNotificationsForOrganizationId } from '@/lib/services/system/notifications';
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

const CreatePaymentOrderInputSchema = z.object({
  clientId: z.string().min(1),
  amount: z.number().finite().positive(),
  description: z.string().min(1),
  installmentsAllowed: z.union([z.literal(1), z.literal(2)]).default(1),
  orgSlug: z.string().optional(),
});

const ProcessPaymentInputSchema = z.object({
  paymentOrderId: z.string().min(1),
  cardNumber: z.string().min(13).max(19),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/),
  cvv: z.string().min(3).max(4),
  installments: z.union([z.literal(1), z.literal(2)]).default(1),
  orgSlug: z.string().optional(),
});

const ClientIdOrgSlugSchema = z.object({
  clientId: z.string().min(1),
  orgSlug: z.string().optional(),
});

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'payments');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

async function assertClientInOrganization(params: { organizationId: string; clientId: string }): Promise<void> {
  const organizationId = String(params.organizationId || '').trim();
  const clientId = String(params.clientId || '').trim();
  if (!organizationId || !clientId) throw new Error('Missing clientId');

  type ClientsFindFirstArgs = Parameters<typeof prisma.clients.findFirst>[0];
  type ClientsWhere = NonNullable<ClientsFindFirstArgs>['where'];
  const where: ClientsWhere = {
    id: clientId,
    organization_id: organizationId,
    deleted_at: null,
  };

  const exists = await prisma.clients.findFirst({
    where,
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
  installmentsAllowed: 1 | 2 = 1,
  orgSlug?: string
): Promise<{ success: boolean; data?: PaymentOrder; error?: string }> {
  try {
    const parsed = CreatePaymentOrderInputSchema.safeParse({
      clientId,
      amount,
      description,
      installmentsAllowed,
      orgSlug,
    });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'createPaymentOrder', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין ליצירת הזמנת תשלום');
    }

    return await withWorkspaceTenantContext(
      String(parsed.data.orgSlug || ''),
      async ({ organizationId }) => {
        await assertClientInOrganization({ organizationId, clientId: parsed.data.clientId });

        const paymentOrder: PaymentOrder = {
          id: randomUUID(),
          clientId: parsed.data.clientId,
          amount: parsed.data.amount,
          description: parsed.data.description,
          status: 'pending',
          createdAt: new Date().toISOString(),
          installmentsAllowed: parsed.data.installmentsAllowed,
        };

        // Save payment order to database
        type SocialPaymentOrdersCreateArgs = Parameters<typeof prisma.socialMediaPaymentOrder.create>[0];
        type SocialPaymentOrdersCreateData = NonNullable<SocialPaymentOrdersCreateArgs>['data'];
        const createData: SocialPaymentOrdersCreateData = {
          id: paymentOrder.id,
          client_id: paymentOrder.clientId,
          amount: new Prisma.Decimal(paymentOrder.amount),
          description: paymentOrder.description,
          status: 'pending',
          installments_allowed: paymentOrder.installmentsAllowed,
          created_at: new Date(paymentOrder.createdAt),
          updated_at: new Date(paymentOrder.createdAt),
        };
        await prisma.socialMediaPaymentOrder.create({
          data: createData,
          select: { id: true },
        });

        revalidatePath('/', 'layout');

        return createSuccessResponse(paymentOrder);
      },
      { source: 'server_actions_payments', reason: 'createPaymentOrder' }
    );
  } catch (error: unknown) {
    captureActionException(error, { action: 'createPaymentOrder' });
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
  installments: 1 | 2 = 1,
  orgSlug?: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const parsed = ProcessPaymentInputSchema.safeParse({
      paymentOrderId,
      cardNumber,
      expiryDate,
      cvv,
      installments,
      orgSlug,
    });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'processPayment', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין לעיבוד תשלום');
    }

    return await withWorkspaceTenantContext(
      String(parsed.data.orgSlug || ''),
      async ({ organizationId }) => {
        // Get payment order
        const order = await prisma.socialMediaPaymentOrder.findUnique({
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

        // Generate transaction ID
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Calculate installment amount
        const totalAmount = order.amount instanceof Prisma.Decimal ? order.amount.toNumber() : Number(order.amount ?? 0);
        const installmentAmount = totalAmount / parsed.data.installments;

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
            String(parsed.data.paymentOrderId),
            String(order.client_id),
            installmentAmount,
            totalAmount,
            parsed.data.installments,
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
          await prisma.socialMediaPaymentOrder.update({
            where: { id: String(parsed.data.paymentOrderId) },
            data: { status: 'paid', updated_at: new Date() },
          });
        } catch (e: unknown) {
          captureActionException(e, { action: 'processPayment', stage: 'update_payment_order', paymentOrderId: String(parsed.data.paymentOrderId) });
        }

        // Update client payment status
        try {
          const clientRow = await prisma.clientClient.findFirst({
            where: { id: String(order.client_id) },
            select: { id: true, organizationId: true, metadata: true },
          });

          const clientIdVal = String(clientRow?.id ?? '').trim();
          const orgIdVal = String(clientRow?.organizationId ?? '').trim();
          if (clientIdVal && orgIdVal) {
            const existingMeta = asRecord(clientRow?.metadata) ?? {};
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
          captureActionException(e, { action: 'processPayment', stage: 'update_client_metadata', clientId: String(order.client_id) });
        }

        // Create internal payment record (NOT a tax invoice — just a DB record for payment tracking)
        await createPaymentRecord(String(order.client_id), totalAmount, String(order.description || ''), transactionId, organizationId);

        // Notify org owner about successful payment
        try {
          const orgOwner = await prisma.organization.findFirst({
            where: { id: organizationId },
            select: { owner_id: true },
          });
          if (orgOwner?.owner_id) {
            insertMisradNotificationsForOrganizationId({
              organizationId,
              recipientIds: [String(orgOwner.owner_id)],
              type: 'FINANCE',
              text: `תשלום התקבל: ₪${totalAmount.toLocaleString()} — ${String(order.description || '')}`,
              reason: 'payment_received',
            }).catch(() => {});
          }
        } catch { /* best-effort */ }

        revalidatePath('/', 'layout');

        return createSuccessResponse({ transactionId });
      },
      { source: 'server_actions_payments', reason: 'processPayment' }
    );
  } catch (error: unknown) {
    captureActionException(error, { action: 'processPayment' });
    return createErrorResponse(error, 'שגיאה בעיבוד התשלום');
  }
}

/**
 * Create internal payment record after payment.
 * WARNING: This is NOT a tax invoice / חשבונית מס. This only creates a local DB record
 * for payment tracking purposes. Actual tax invoices must go through Green Invoice
 * integration (CreateInvoiceModal → /api/integrations/green-invoice/create).
 */
async function createPaymentRecord(
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
    captureActionException(error, { action: 'createInvoice', clientId, transactionId });
  }
}

/**
 * Get invoices for a client
 */
export async function getInvoices(
  clientId: string,
  orgSlug?: string
): Promise<{ success: boolean; data?: FinanceInvoice[]; error?: string }> {
  try {
    const parsed = ClientIdOrgSlugSchema.safeParse({ clientId, orgSlug });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'getInvoices', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין לטעינת חשבוניות');
    }

    return await withWorkspaceTenantContext(
      String(parsed.data.orgSlug || ''),
      async ({ organizationId }) => {
        await assertClientInOrganization({ organizationId, clientId: parsed.data.clientId });

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

        revalidatePath('/', 'layout');

        return createSuccessResponse(invoices);
      },
      { source: 'server_actions_payments', reason: 'getInvoices' }
    );
  } catch (error: unknown) {
    captureActionException(error, { action: 'getInvoices' });
    return createErrorResponse(error, 'שגיאה בטעינת חשבוניות');
  }
}

/**
 * Get payment history for a client
 */
export async function getPaymentHistory(
  clientId: string,
  orgSlug?: string
): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
  try {
    const parsed = ClientIdOrgSlugSchema.safeParse({ clientId, orgSlug });
    if (!parsed.success) {
      captureActionException(parsed.error, { action: 'getPaymentHistory', stage: 'validate_input' });
      return createErrorResponse(null, 'קלט לא תקין לטעינת היסטוריית תשלומים');
    }

    return await withWorkspaceTenantContext(
      String(parsed.data.orgSlug || ''),
      async ({ organizationId }) => {
        await assertClientInOrganization({ organizationId, clientId: parsed.data.clientId });

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
        revalidatePath('/', 'layout');
        return createSuccessResponse(list);
      },
      { source: 'server_actions_payments', reason: 'getPaymentHistory' }
    );
  } catch (error: unknown) {
    captureActionException(error, { action: 'getPaymentHistory' });
    return createErrorResponse(error, 'שגיאה בטעינת היסטוריית תשלומים');
  }
}

