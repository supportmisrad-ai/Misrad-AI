'use server';

/**
 * My Billing Actions
 * Server Actions for the organization billing portal (/w/[orgSlug]/billing)
 * RESTRICTED: Only users with 'view_financials' permission can access billing data
 */

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { ActionResult } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'my_billing');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

export type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  invoiceUrl: string | null;
  pdfUrl: string | null;
  paymentUrl: string | null;
  description: string | null;
  emailSent: boolean;
  paidAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
};

export type MyBillingData = {
  organizationName: string;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'cancelled';
  mrr: number;
  billingEmail: string | null;
  billingCycle: 'monthly' | 'yearly' | null;
  nextBillingDate: Date | null;
  lastPaymentDate: Date | null;
  lastPaymentAmount: number | null;
  balance: number;
  invoices: BillingInvoice[];
};

/**
 * Get billing information for the current organization (visible to org members)
 */
export async function getMyBillingData(orgSlug: string): Promise<ActionResult<MyBillingData>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    
    // ✅ CRITICAL: Only users with view_financials permission can access billing
    const hasFinancialAccess = await hasPermission('view_financials');
    
    if (!hasFinancialAccess) {
      return createErrorResponse(
        new Error('Access denied - financial permission required'),
        '🔒 אין לך הרשאה לצפות בנתוני חיוב. רק מנהלים ו-CEO יכולים לראות מידע זה. פנה למנהל הארגון.'
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: workspace.id },
      select: {
        name: true,
        subscription_status: true,
        mrr: true,
        billing_email: true,
        billing_cycle: true,
        next_billing_date: true,
        last_payment_date: true,
        last_payment_amount: true,
        balance: true,
      },
    });

    if (!org) {
      return createErrorResponse(new Error('Organization not found'), 'ארגון לא נמצא');
    }

    const invoices = await prisma.billing_invoices.findMany({
      where: { organization_id: workspace.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const mrr = org.mrr instanceof Prisma.Decimal ? org.mrr.toNumber() : Number(org.mrr ?? 0);
    const balance = org.balance instanceof Prisma.Decimal ? org.balance.toNumber() : Number(org.balance ?? 0);
    const lastPaymentAmount = org.last_payment_amount instanceof Prisma.Decimal
      ? org.last_payment_amount.toNumber()
      : org.last_payment_amount ? Number(org.last_payment_amount) : null;

    const status = org.subscription_status || 'trial';
    const validStatus: MyBillingData['subscriptionStatus'] = (
      ['trial', 'active', 'past_due', 'cancelled'].includes(status) ? status : 'trial'
    ) as MyBillingData['subscriptionStatus'];

    const mappedInvoices: BillingInvoice[] = invoices.map((inv) => {
      const amount = inv.amount instanceof Prisma.Decimal ? inv.amount.toNumber() : Number(inv.amount);
      const invStatus = (['pending', 'paid', 'cancelled', 'overdue'].includes(inv.status)
        ? inv.status
        : 'pending') as BillingInvoice['status'];
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
        emailSent: inv.email_sent,
        paidAt: inv.paid_at,
        dueDate: inv.due_date,
        createdAt: inv.created_at,
      };
    });

    return createSuccessResponse({
      organizationName: org.name,
      subscriptionStatus: validStatus,
      mrr,
      billingEmail: org.billing_email,
      billingCycle: org.billing_cycle === 'monthly' || org.billing_cycle === 'yearly' ? org.billing_cycle : null,
      nextBillingDate: org.next_billing_date ? new Date(org.next_billing_date) : null,
      lastPaymentDate: org.last_payment_date ? new Date(org.last_payment_date) : null,
      lastPaymentAmount,
      balance,
      invoices: mappedInvoices,
    });
  } catch (error: unknown) {
    captureActionException(error, { action: 'getMyBillingData', orgSlug: String(orgSlug) });
    return createErrorResponse(error, 'שגיאה בטעינת נתוני חיוב');
  }
}
