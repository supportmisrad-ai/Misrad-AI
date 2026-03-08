/**
 * Server Actions for App-Level Billing
 *
 * These actions are used to manage billing for organizations
 * using Morning (Green Invoice) API
 */

'use server';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { ActionResult } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import * as Sentry from '@sentry/nextjs';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import {
  createAppInvoice,
  getOrganizationBilling,
  getOrganizationBillingStatus,
  adjustOrganizationBalance,
  type AppInvoiceResult,
  type OrganizationBillingData,
} from '@/lib/services/app-billing';

function captureActionException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'server_action');
    scope.setTag('domain', 'app_billing');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

/**
 * Create invoice for organization (Admin only)
 *
 * @param organizationId - Organization ID to bill
 * @param options - Optional invoice customization
 */
export async function createOrganizationInvoice(
  organizationId: string,
  options?: {
    description?: string;
    dueDate?: string; // ISO date string
    customItems?: Array<{
      description: string;
      quantity: number;
      price: number;
      vatRate?: number;
    }>;
  }
): Promise<ActionResult<AppInvoiceResult>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    // Only super admins can create invoices
    await requireSuperAdmin();

    // Validate organizationId
    if (!organizationId || typeof organizationId !== 'string') {
      return createErrorResponse(new Error('Invalid organizationId'), 'מזהה ארגון לא תקין');
    }

    // Convert dueDate string to Date if provided
    let dueDate: Date | undefined;
    if (options?.dueDate) {
      try {
        dueDate = new Date(options.dueDate);
        if (isNaN(dueDate.getTime())) {
          return createErrorResponse(new Error('Invalid dueDate'), 'תאריך לא תקין');
        }
      } catch {
        return createErrorResponse(new Error('Invalid dueDate format'), 'פורמט תאריך לא תקין');
      }
    }

    // Create invoice
    const result = await createAppInvoice(organizationId, {
      description: options?.description,
      dueDate,
      items: options?.customItems,
    });

    if (!result.success) {
      return createErrorResponse(new Error(result.error || 'Unknown error'), result.error || 'שגיאה ביצירת חשבונית');
    }

    return createSuccessResponse(result);
  } catch (error: unknown) {
    captureActionException(error, { action: 'createOrganizationInvoice', organizationId: String(organizationId) });
    return createErrorResponse(error, 'שגיאה ביצירת חשבונית');
  }
}

/**
 * Get organization billing information (Admin only)
 *
 * @param organizationId - Organization ID
 */
export async function getOrganizationBillingInfo(
  organizationId: string
): Promise<ActionResult<OrganizationBillingData>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    if (!organizationId || typeof organizationId !== 'string') {
      return createErrorResponse(new Error('Invalid organizationId'), 'מזהה ארגון לא תקין');
    }

    const billing = await getOrganizationBilling(organizationId);

    if (!billing) {
      return createErrorResponse(new Error('Organization not found'), 'ארגון לא נמצא');
    }

    return createSuccessResponse(billing);
  } catch (error: unknown) {
    captureActionException(error, { action: 'getOrganizationBillingInfo', organizationId: String(organizationId) });
    return createErrorResponse(error, 'שגיאה בטעינת פרטי חיוב');
  }
}

/**
 * Get organization billing status (Admin only)
 *
 * @param organizationId - Organization ID
 */
export async function getOrganizationBillingStatusAction(organizationId: string): Promise<
  ActionResult<{
    isActive: boolean;
    isTrial: boolean;
    isPastDue: boolean;
    daysUntilNextBilling: number | null;
    mrr: number;
  }>
> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    if (!organizationId || typeof organizationId !== 'string') {
      return createErrorResponse(new Error('Invalid organizationId'), 'מזהה ארגון לא תקין');
    }

    const status = await getOrganizationBillingStatus(organizationId);

    if (!status) {
      return createErrorResponse(new Error('Organization not found'), 'ארגון לא נמצא');
    }

    return createSuccessResponse(status);
  } catch (error: unknown) {
    captureActionException(error, {
      action: 'getOrganizationBillingStatusAction',
      organizationId: String(organizationId),
    });
    return createErrorResponse(error, 'שגיאה בבדיקת סטטוס חיוב');
  }
}

/**
 * Bulk create invoices for multiple organizations (Admin only)
 * Useful for monthly billing runs
 *
 * @param organizationIds - Array of organization IDs
 */
export async function bulkCreateInvoices(
  organizationIds: string[]
): Promise<
  ActionResult<
    Array<{
      organizationId: string;
      success: boolean;
      invoiceNumber?: string;
      error?: string;
    }>
  >
> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    if (!Array.isArray(organizationIds) || organizationIds.length === 0) {
      return createErrorResponse(new Error('Invalid organizationIds'), 'רשימת ארגונים לא תקינה');
    }

    const results = [];

    for (const orgId of organizationIds) {
      try {
        const result = await createAppInvoice(orgId);
        results.push({
          organizationId: orgId,
          success: result.success,
          invoiceNumber: result.invoiceNumber,
          error: result.error,
        });
      } catch (error: unknown) {
        captureActionException(error, { action: 'bulkCreateInvoices', organizationId: orgId });
        results.push({
          organizationId: orgId,
          success: false,
          error: String(error),
        });
      }
    }

    return createSuccessResponse(results);
  } catch (error: unknown) {
    captureActionException(error, { action: 'bulkCreateInvoices', count: organizationIds.length });
    return createErrorResponse(error, 'שגיאה ביצירת חשבוניות באצווה');
  }
}

/**
 * Generate payment link for organization (Admin only)
 * Creates an invoice and returns the payment URL
 *
 * @param organizationId - Organization ID
 */
export async function generatePaymentLink(organizationId: string): Promise<
  ActionResult<{
    invoiceId: string;
    invoiceNumber: string;
    paymentUrl: string;
    amount: number;
  }>
> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    if (!organizationId || typeof organizationId !== 'string') {
      return createErrorResponse(new Error('Invalid organizationId'), 'מזהה ארגון לא תקין');
    }

    // Get billing info to show amount
    const billing = await getOrganizationBilling(organizationId);
    if (!billing) {
      return createErrorResponse(new Error('Organization not found'), 'ארגון לא נמצא');
    }

    // Create invoice
    const result = await createAppInvoice(organizationId);

    if (!result.success || !result.invoiceId || !result.invoiceNumber) {
      return createErrorResponse(
        new Error(result.error || 'Failed to create invoice'),
        result.error || 'שגיאה ביצירת חשבונית'
      );
    }

    // Payment URL is included in the invoice result
    const paymentUrl = result.paymentUrl || result.invoiceUrl || '';

    if (!paymentUrl) {
      return createErrorResponse(new Error('No payment URL returned'), 'לא התקבל קישור תשלום');
    }

    return createSuccessResponse({
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      paymentUrl,
      amount: billing.mrr,
    });
  } catch (error: unknown) {
    captureActionException(error, { action: 'generatePaymentLink', organizationId: String(organizationId) });
    return createErrorResponse(error, 'שגיאה ביצירת קישור תשלום');
  }
}

/**
 * Get billing events (audit trail) for all organizations (Admin only)
 *
 * @param limit - Maximum number of events to return
 */
export async function getBillingEvents(limit: number = 100): Promise<
  ActionResult<
    Array<{
      id: string;
      organizationId: string | null;
      organizationName: string | null;
      eventType: string;
      amount: number;
      currency: string;
      metadata: unknown;
      createdAt: Date;
    }>
  >
> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    const events = await withTenantIsolationContext(
      { source: 'app_billing', reason: 'admin_get_all_billing_events', mode: 'global_admin', isSuperAdmin: true, suppressReporting: true },
      () => prisma.billing_events.findMany({
        take: Math.min(limit, 500),
        orderBy: { created_at: 'desc' },
        include: {
          organizations: {
            select: {
              name: true,
            },
          },
        },
      })
    );

    const mapped = events.map((event) => {
      const payload = event.payload as any;
      return {
        id: event.id,
        organizationId: event.organization_id,
        organizationName: event.organizations?.name || null,
        eventType: event.event_type,
        amount: payload?.amount ? parseFloat(String(payload.amount)) : 0,
        currency: payload?.currency || 'ILS',
        metadata: payload?.metadata || null,
        createdAt: event.created_at || new Date(),
      };
    });

    return createSuccessResponse(mapped);
  } catch (error: unknown) {
    captureActionException(error, { action: 'getBillingEvents' });
    return createErrorResponse(error, 'שגיאה בטעינת אירועי חיוב');
  }
}

/**
 * Manually adjust organization balance (Admin only)
 * Used for cash/Bit payments or manual corrections
 *
 * @param organizationId - Organization ID
 * @param amount - Amount to add (positive) or deduct (negative)
 * @param reason - Reason for adjustment
 * @param paymentMethod - Payment method
 */
export async function adjustBalanceManually(
  organizationId: string,
  amount: number,
  reason: string,
  paymentMethod: 'cash' | 'bit' | 'bank_transfer' | 'check' | 'correction' = 'cash'
): Promise<ActionResult<{ newBalance: number }>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'נדרשת התחברות', authCheck.error || 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    if (!organizationId || typeof organizationId !== 'string') {
      return createErrorResponse(new Error('Invalid organizationId'), 'מזהה ארגון לא תקין');
    }

    if (!Number.isFinite(amount) || amount === 0) {
      return createErrorResponse(new Error('Invalid amount'), 'סכום לא תקין');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return createErrorResponse(new Error('Reason required'), 'יש לציין סיבה לעדכון');
    }

    const result = await adjustOrganizationBalance(organizationId, amount, reason.trim(), paymentMethod);

    if (!result.success || result.newBalance === undefined) {
      return createErrorResponse(
        new Error(result.error || 'Failed to adjust balance'),
        result.error || 'שגיאה בעדכון יתרה'
      );
    }

    return createSuccessResponse({ newBalance: result.newBalance });
  } catch (error: unknown) {
    captureActionException(error, {
      action: 'adjustBalanceManually',
      organizationId: String(organizationId),
      amount: Number(amount),
    });
    return createErrorResponse(error, 'שגיאה בעדכון יתרה ידני');
  }
}

// ─────────────────────────────────────────────────────────────
// Get Organization Invoices (Admin only)
// ─────────────────────────────────────────────────────────────

export type AdminInvoice = {
  id: string;
  morningInvoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  pdfUrl: string | null;
  paymentUrl: string | null;
  description: string | null;
  emailSent: boolean;
  paidAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
};

export async function getOrganizationInvoices(
  organizationId: string
): Promise<ActionResult<AdminInvoice[]>> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse(authCheck.error || 'Unauthorized', 'נדרשת התחברות');
    }

    await requireSuperAdmin();

    const invoices = await prisma.billing_invoices.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const mapped: AdminInvoice[] = invoices.map((inv) => ({
      id: inv.id,
      morningInvoiceId: inv.morning_invoice_id,
      invoiceNumber: inv.invoice_number,
      amount: inv.amount instanceof Prisma.Decimal ? inv.amount.toNumber() : Number(inv.amount),
      currency: inv.currency,
      status: inv.status,
      invoiceUrl: inv.invoice_url,
      pdfUrl: inv.pdf_url,
      paymentUrl: inv.payment_url,
      description: inv.description,
      emailSent: inv.email_sent,
      paidAt: inv.paid_at,
      dueDate: inv.due_date,
      createdAt: inv.created_at,
    }));

    return createSuccessResponse(mapped);
  } catch (error: unknown) {
    captureActionException(error, {
      action: 'getOrganizationInvoices',
      organizationId: String(organizationId),
    });
    return createErrorResponse(error, 'שגיאה בטעינת חשבוניות');
  }
}
