'use server';

/**
 * Business Client Billing Actions
 * Allows business clients to view their invoices from Misrad-AI
 */

import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { ActionResult } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'business_client_billing');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

export type BusinessClientInvoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  invoiceUrl: string | null;
  pdfUrl: string | null;
  paymentUrl: string | null;
  description: string | null;
  paidAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
};

/**
 * Get invoices for a business client
 * No auth required - verified via token in the calling page
 */
export async function getBusinessClientInvoices(
  businessClientId: string
): Promise<ActionResult<BusinessClientInvoice[]>> {
  try {
    if (!businessClientId || typeof businessClientId !== 'string') {
      return createErrorResponse(new Error('Invalid business client ID'), 'מזהה לקוח לא תקין');
    }

    // Get business client with first organization
    const businessClient = await prisma.businessClient.findUnique({
      where: { id: businessClientId },
      select: { 
        organizations: { 
          select: { id: true },
          take: 1 
        } 
      },
    });

    if (!businessClient || businessClient.organizations.length === 0) {
      return createErrorResponse(new Error('Business client or organization not found'), 'לקוח או ארגון לא נמצא');
    }

    // Fetch invoices for this organization
    const invoices = await prisma.billing_invoices.findMany({
      where: { organization_id: businessClient.organizations[0].id },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const mapped: BusinessClientInvoice[] = invoices.map((inv) => {
      const amount = inv.amount instanceof Prisma.Decimal ? inv.amount.toNumber() : Number(inv.amount);
      const invStatus = (['pending', 'paid', 'cancelled', 'overdue'].includes(inv.status)
        ? inv.status
        : 'pending') as BusinessClientInvoice['status'];
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        amount,
        currency: inv.currency,
        status: invStatus,
        invoiceUrl: inv.invoice_url,
        pdfUrl: inv.pdf_url,
        paymentUrl: inv.payment_url,
        description: inv.description,
        paidAt: inv.paid_at,
        dueDate: inv.due_date,
        createdAt: inv.created_at,
      };
    });

    return createSuccessResponse(mapped);
  } catch (error: unknown) {
    captureActionException(error, {
      action: 'getBusinessClientInvoices',
      businessClientId: String(businessClientId),
    });
    return createErrorResponse(error, 'שגיאה בטעינת חשבוניות');
  }
}
