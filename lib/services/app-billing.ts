/**
 * App-Level Billing Service (Level 1)
 *
 * This service handles billing for Misrad-AI itself (charging organizations)
 * Uses Morning (חשבונית ירוקה) API for payment processing
 *
 * IMPORTANT: This is separate from lib/integrations/green-invoice.ts
 * which is used by customers. This service is for our own billing.
 */

import 'server-only';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { getErrorMessage } from '@/lib/shared/unknown';
import { sendEmail } from '@/lib/email-sender';
import { generateInvoiceCreatedEmailHTML } from '@/lib/email-generators';
import { getBaseUrl } from '@/lib/utils';

// Morning API Configuration (for app billing)
const MORNING_API_URL = 'https://api.greeninvoice.co.il/api/v1';
const MORNING_APP_API_KEY = process.env.MORNING_APP_API_KEY;

if (!MORNING_APP_API_KEY && process.env.NODE_ENV === 'production') {
  console.warn('[App Billing] MORNING_APP_API_KEY not configured. App billing will not work.');
}

function captureException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'app_billing');
    scope.setTag('service', 'morning_app');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

/**
 * Organization billing data
 */
export type OrganizationBillingData = {
  id: string;
  name: string;
  mrr: number;
  balance: number;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'cancelled';
  billingEmail: string | null;
  billingCycle: 'monthly' | 'yearly' | null;
  nextBillingDate: Date | null;
};

/**
 * Invoice creation result
 */
export type AppInvoiceResult = {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  pdfUrl?: string;
  paymentUrl?: string;
  error?: string;
};

/**
 * Get organization billing data
 */
export async function getOrganizationBilling(organizationId: string): Promise<OrganizationBillingData | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        mrr: true,
        balance: true,
        subscription_status: true,
        billing_email: true,
        billing_cycle: true,
        next_billing_date: true,
      },
    });

    if (!org) return null;

    const mrr = org.mrr instanceof Prisma.Decimal ? org.mrr.toNumber() : Number(org.mrr ?? 0);
    const balance = org.balance instanceof Prisma.Decimal ? org.balance.toNumber() : Number(org.balance ?? 0);
    const status = org.subscription_status || 'trial';
    const validStatus = ['trial', 'active', 'past_due', 'cancelled'].includes(status) ? status : 'trial';

    return {
      id: org.id,
      name: org.name,
      mrr,
      balance,
      subscriptionStatus: validStatus as OrganizationBillingData['subscriptionStatus'],
      billingEmail: org.billing_email,
      billingCycle: org.billing_cycle === 'monthly' || org.billing_cycle === 'yearly' ? org.billing_cycle : null,
      nextBillingDate: org.next_billing_date ? new Date(org.next_billing_date) : null,
    };
  } catch (error: unknown) {
    captureException(error, { action: 'getOrganizationBilling', organizationId });
    throw error;
  }
}

/**
 * Create invoice for organization using Morning API
 *
 * @param organizationId - Organization ID to bill
 * @param options - Optional invoice customization
 */
export async function createAppInvoice(
  organizationId: string,
  options?: {
    description?: string;
    dueDate?: Date;
    items?: Array<{
      description: string;
      quantity: number;
      price: number;
      vatRate?: number;
    }>;
  }
): Promise<AppInvoiceResult> {
  if (!MORNING_APP_API_KEY) {
    return {
      success: false,
      error: 'Morning API key not configured. Cannot create invoice.',
    };
  }

  try {
    // Get organization billing data
    const orgBilling = await getOrganizationBilling(organizationId);

    if (!orgBilling) {
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    if (!orgBilling.billingEmail) {
      return {
        success: false,
        error: 'Billing email not configured for organization',
      };
    }

    if (orgBilling.mrr <= 0 && !options?.items) {
      return {
        success: false,
        error: 'No MRR configured and no custom items provided',
      };
    }

    // Prepare invoice items
    const items = options?.items || [
      {
        description: options?.description || `מנוי חודשי - ${orgBilling.name}`,
        quantity: 1,
        price: orgBilling.mrr,
        vatRate: 17,
      },
    ];

    // Calculate due date (default: 14 days from now)
    const dueDate = options?.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const dueDateString = dueDate.toISOString().split('T')[0];

    // Prepare Morning API payload
    const payload = {
      type: 320, // Invoice type
      client: {
        name: orgBilling.name,
        emails: [orgBilling.billingEmail],
        phones: [],
      },
      payment: {
        method: 'bank_transfer',
        date: dueDateString,
      },
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        vatRate: item.vatRate ?? 17,
      })),
      currency: 'ILS',
      notes: `חיוב עבור שימוש במערכת Misrad-AI\nארגון: ${orgBilling.name}`,
    };

    // Call Morning API
    const response = await fetch(`${MORNING_API_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MORNING_APP_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      captureException(new Error(`Morning API error: ${response.status}`), {
        action: 'createAppInvoice',
        organizationId,
        status: response.status,
        error: errorText,
      });

      return {
        success: false,
        error: `Failed to create invoice: ${response.status}`,
      };
    }

    const result = await response.json();

    if (!result.id || !result.number) {
      captureException(new Error('Morning API returned invoice without id or number'), {
        action: 'createAppInvoice',
        organizationId,
        result: JSON.stringify(result).slice(0, 500),
      });
      return { success: false, error: 'Morning API returned incomplete invoice data' };
    }

    const invoiceId = String(result.id);
    const invoiceNumber = String(result.number);
    const invoiceUrl = result.url ? String(result.url) : undefined;
    const pdfUrl = result.pdfUrl ? String(result.pdfUrl) : undefined;
    const paymentUrl = result.paymentUrl ? String(result.paymentUrl) : undefined;

    // Save invoice to DB
    await prisma.billing_invoices.create({
      data: {
        organization_id: organizationId,
        morning_invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        amount: new Prisma.Decimal(orgBilling.mrr),
        currency: 'ILS',
        status: 'pending',
        invoice_url: invoiceUrl ?? null,
        pdf_url: pdfUrl ?? null,
        payment_url: paymentUrl ?? null,
        description: options?.description ?? `מנוי חודשי - ${orgBilling.name}`,
        due_date: options?.dueDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        email_sent: false,
      },
    });

    // Send invoice email to billing_email automatically
    let emailSent = false;
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { billing_email: true, slug: true, owner: { select: { email: true, full_name: true } } },
      });
      const toEmail = org?.billing_email || org?.owner?.email;
      if (toEmail) {
        const baseUrl = getBaseUrl();
        const portalUrl = org?.slug ? `${baseUrl}/w/${encodeURIComponent(org.slug)}/billing` : baseUrl;
        const html = generateInvoiceCreatedEmailHTML({
          ownerName: org?.owner?.full_name ?? null,
          organizationName: orgBilling.name,
          amount: orgBilling.mrr,
          invoiceNumber,
          invoiceUrl,
          pdfUrl,
          paymentUrl,
          portalUrl,
          description: options?.description ?? `מנוי חודשי - ${orgBilling.name}`,
        });
        await sendEmail({
          emailTypeId: 'billing_invoice_created',
          to: toEmail,
          subject: `חשבונית חדשה #${invoiceNumber} — ${orgBilling.name}`,
          html,
          forceSend: true,
        });
        emailSent = true;
        // Mark email as sent
        await prisma.billing_invoices.updateMany({
          where: { morning_invoice_id: invoiceId, organization_id: organizationId },
          data: { email_sent: true, updated_at: new Date() },
        });
      }
    } catch (emailErr: unknown) {
      captureException(emailErr, { action: 'createAppInvoice:sendEmail', organizationId });
    }

    // Create billing event for audit trail
    await prisma.billing_events.create({
      data: {
        organization_id: organizationId,
        event_type: 'invoice_created',
        payload: {
          morningInvoiceId: invoiceId,
          invoiceNumber,
          amount: orgBilling.mrr,
          currency: 'ILS',
          emailSent,
          source: 'manual',
        } as Prisma.InputJsonValue,
        occurred_at: new Date(),
        created_at: new Date(),
      },
    });

    return {
      success: true,
      invoiceId,
      invoiceNumber,
      invoiceUrl,
      pdfUrl,
      paymentUrl,
    };
  } catch (error: unknown) {
    captureException(error, { action: 'createAppInvoice', organizationId });
    return {
      success: false,
      error: getErrorMessage(error) || 'Unknown error creating invoice',
    };
  }
}

/**
 * Mark organization payment as successful
 * Called by webhook handler when payment is confirmed
 *
 * @param organizationId - Organization ID
 * @param paymentAmount - Amount paid
 * @param morningInvoiceId - Morning invoice ID
 */
export async function markPaymentSuccessful(
  organizationId: string,
  paymentAmount: number,
  morningInvoiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        subscription_status: true,
        billing_cycle: true,
        balance: true,
      },
    });

    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    // Calculate next billing date
    const now = new Date();
    let nextBillingDate: Date | null = null;

    if (org.billing_cycle === 'monthly') {
      nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else if (org.billing_cycle === 'yearly') {
      nextBillingDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }

    // Calculate new balance (add payment to existing balance)
    const currentBalance = org.balance instanceof Prisma.Decimal ? org.balance.toNumber() : Number(org.balance ?? 0);
    const newBalance = currentBalance + paymentAmount;

    // Update organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscription_status: 'active',
        last_payment_date: now,
        last_payment_amount: new Prisma.Decimal(paymentAmount),
        balance: new Prisma.Decimal(newBalance),
        next_billing_date: nextBillingDate,
        updated_at: now,
      },
    });

    // Create billing event (optional tracking)
    await prisma.billing_events.create({
      data: {
        organization_id: organizationId,
        event_type: 'payment_successful',
        payload: {
          amount: paymentAmount,
          currency: 'ILS',
          morningInvoiceId,
          source: 'morning_webhook',
          previousBalance: currentBalance,
          newBalance,
        } as Prisma.InputJsonValue,
        created_at: now,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    captureException(error, {
      action: 'markPaymentSuccessful',
      organizationId,
      paymentAmount,
      morningInvoiceId,
    });
    return {
      success: false,
      error: getErrorMessage(error) || 'Failed to mark payment as successful',
    };
  }
}

/**
 * Mark organization payment as failed
 *
 * @param organizationId - Organization ID
 * @param morningInvoiceId - Morning invoice ID
 * @param reason - Failure reason
 */
export async function markPaymentFailed(
  organizationId: string,
  morningInvoiceId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, subscription_status: true },
    });

    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    // Update to past_due if currently active
    const shouldUpdateStatus = org.subscription_status === 'active' || org.subscription_status === 'trial';

    if (shouldUpdateStatus) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscription_status: 'past_due',
          updated_at: new Date(),
        },
      });
    }

    // Create billing event
    await prisma.billing_events.create({
      data: {
        organization_id: organizationId,
        event_type: 'payment_failed',
        payload: {
          amount: 0,
          currency: 'ILS',
          morningInvoiceId,
          reason: reason || 'Unknown',
          source: 'morning_webhook',
        } as Prisma.InputJsonValue,
        created_at: new Date(),
      },
    });

    return { success: true };
  } catch (error: unknown) {
    captureException(error, {
      action: 'markPaymentFailed',
      organizationId,
      morningInvoiceId,
    });
    return {
      success: false,
      error: getErrorMessage(error) || 'Failed to mark payment as failed',
    };
  }
}

/**
 * Get organization's billing status
 */
export async function getOrganizationBillingStatus(organizationId: string): Promise<{
  isActive: boolean;
  isTrial: boolean;
  isPastDue: boolean;
  daysUntilNextBilling: number | null;
  mrr: number;
} | null> {
  try {
    const billing = await getOrganizationBilling(organizationId);
    if (!billing) return null;

    const isActive = billing.subscriptionStatus === 'active';
    const isTrial = billing.subscriptionStatus === 'trial';
    const isPastDue = billing.subscriptionStatus === 'past_due';

    let daysUntilNextBilling: number | null = null;
    if (billing.nextBillingDate) {
      const now = new Date();
      const diff = billing.nextBillingDate.getTime() - now.getTime();
      daysUntilNextBilling = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return {
      isActive,
      isTrial,
      isPastDue,
      daysUntilNextBilling,
      mrr: billing.mrr,
    };
  } catch (error: unknown) {
    captureException(error, { action: 'getOrganizationBillingStatus', organizationId });
    return null;
  }
}

/**
 * Manually adjust organization balance
 * Used for cash/Bit payments or manual corrections
 *
 * @param organizationId - Organization ID
 * @param amount - Amount to add (positive) or deduct (negative)
 * @param reason - Reason for adjustment
 * @param paymentMethod - Payment method (cash, bit, bank_transfer, etc.)
 */
export async function adjustOrganizationBalance(
  organizationId: string,
  amount: number,
  reason: string,
  paymentMethod: 'cash' | 'bit' | 'bank_transfer' | 'check' | 'correction' = 'cash'
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        balance: true,
        name: true,
      },
    });

    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    // Calculate new balance
    const currentBalance = org.balance instanceof Prisma.Decimal ? org.balance.toNumber() : Number(org.balance ?? 0);
    const newBalance = currentBalance + amount;

    // Update organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        balance: new Prisma.Decimal(newBalance),
        updated_at: new Date(),
      },
    });

    // Create billing event for audit trail
    await prisma.billing_events.create({
      data: {
        organization_id: organizationId,
        event_type: 'manual_balance_adjustment',
        payload: {
          amount: Math.abs(amount),
          currency: 'ILS',
          source: 'manual_adjustment',
          paymentMethod,
          reason,
          previousBalance: currentBalance,
          newBalance,
          adjustmentAmount: amount,
          adjustmentType: amount >= 0 ? 'credit' : 'debit',
        } as Prisma.InputJsonValue,
        created_at: new Date(),
      },
    });

    return { success: true, newBalance };
  } catch (error: unknown) {
    captureException(error, {
      action: 'adjustOrganizationBalance',
      organizationId,
      amount,
    });
    return {
      success: false,
      error: getErrorMessage(error) || 'Failed to adjust balance',
    };
  }
}
