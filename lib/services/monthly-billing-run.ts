/**
 * Monthly Billing Run Service
 *
 * Automatically creates invoices for all active organizations
 * whose next_billing_date has passed (or is today).
 *
 * Uses Morning (Green Invoice) API via app-billing service.
 * Designed to be called from a Vercel Cron job on the 1st of each month.
 */

import 'server-only';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { getErrorMessage } from '@/lib/shared/unknown';
import { createAppInvoice } from '@/lib/services/app-billing';
import { logger } from '@/lib/server/logger';

const TAG = 'monthly-billing-run';

export type BillingRunResult = {
  success: boolean;
  timestamp: string;
  totalEligible: number;
  totalInvoiced: number;
  totalSkipped: number;
  totalFailed: number;
  invoiced: Array<{
    organizationId: string;
    organizationName: string;
    invoiceNumber: string;
    amount: number;
  }>;
  skipped: Array<{
    organizationId: string;
    organizationName: string;
    reason: string;
  }>;
  failed: Array<{
    organizationId: string;
    organizationName: string;
    error: string;
  }>;
  error?: string;
};

/**
 * Run monthly billing for all eligible organizations.
 *
 * Eligibility:
 * - subscription_status = 'active'
 * - mrr > 0
 * - billing_email is set
 * - next_billing_date <= today (or null — first billing)
 *
 * Safety:
 * - Idempotent: checks billing_invoices to avoid double-invoicing for the same month
 * - Each org is processed independently (one failure doesn't block others)
 */
export async function runMonthlyBilling(): Promise<BillingRunResult> {
  const now = new Date();
  const timestamp = now.toISOString();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  logger.info(TAG, `Starting monthly billing run for ${currentMonth}`);

  const result: BillingRunResult = {
    success: true,
    timestamp,
    totalEligible: 0,
    totalInvoiced: 0,
    totalSkipped: 0,
    totalFailed: 0,
    invoiced: [],
    skipped: [],
    failed: [],
  };

  try {
    // 1. Find all eligible organizations
    const orgs = await prisma.organization.findMany({
      where: {
        subscription_status: 'active',
      },
      select: {
        id: true,
        name: true,
        mrr: true,
        billing_email: true,
        billing_cycle: true,
        next_billing_date: true,
      },
    });

    result.totalEligible = orgs.length;
    logger.info(TAG, `Found ${orgs.length} active organizations`);

    // 2. Process each organization
    for (const org of orgs) {
      const orgName = org.name || org.id;
      const mrr = org.mrr instanceof Prisma.Decimal ? org.mrr.toNumber() : Number(org.mrr ?? 0);

      // Skip: no MRR
      if (mrr <= 0) {
        result.skipped.push({ organizationId: org.id, organizationName: orgName, reason: 'MRR = 0' });
        result.totalSkipped++;
        continue;
      }

      // Skip: no billing email
      if (!org.billing_email) {
        result.skipped.push({ organizationId: org.id, organizationName: orgName, reason: 'אין מייל לחיוב' });
        result.totalSkipped++;
        continue;
      }

      // Skip: next_billing_date is in the future
      if (org.next_billing_date) {
        const nextDate = new Date(org.next_billing_date);
        if (nextDate > now) {
          result.skipped.push({
            organizationId: org.id,
            organizationName: orgName,
            reason: `תאריך חיוב הבא: ${nextDate.toISOString().slice(0, 10)}`,
          });
          result.totalSkipped++;
          continue;
        }
      }

      // Idempotency: check if invoice already exists for this month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const existingInvoice = await prisma.billing_invoices.findFirst({
        where: {
          organization_id: org.id,
          created_at: { gte: monthStart, lte: monthEnd },
          status: { in: ['pending', 'paid'] },
        },
        select: { id: true, invoice_number: true },
      });

      if (existingInvoice) {
        result.skipped.push({
          organizationId: org.id,
          organizationName: orgName,
          reason: `חשבונית כבר קיימת לחודש זה (#${existingInvoice.invoice_number})`,
        });
        result.totalSkipped++;
        continue;
      }

      // Create invoice via Morning API
      try {
        const billingCycle = org.billing_cycle === 'yearly' ? 'שנתי' : 'חודשי';
        const invoiceResult = await createAppInvoice(org.id, {
          description: `מנוי ${billingCycle} - ${orgName} (${currentMonth})`,
        });

        if (invoiceResult.success && invoiceResult.invoiceNumber) {
          result.invoiced.push({
            organizationId: org.id,
            organizationName: orgName,
            invoiceNumber: invoiceResult.invoiceNumber,
            amount: mrr,
          });
          result.totalInvoiced++;
          logger.info(TAG, `Invoice created for ${orgName}: #${invoiceResult.invoiceNumber}`);
        } else {
          result.failed.push({
            organizationId: org.id,
            organizationName: orgName,
            error: invoiceResult.error || 'Unknown error from Morning API',
          });
          result.totalFailed++;
          logger.error(TAG, `Failed to create invoice for ${orgName}: ${invoiceResult.error}`);
        }
      } catch (error: unknown) {
        const msg = getErrorMessage(error) || 'Unknown error';
        result.failed.push({ organizationId: org.id, organizationName: orgName, error: msg });
        result.totalFailed++;
        logger.error(TAG, `Exception creating invoice for ${orgName}`, error);
        Sentry.captureException(error, { tags: { layer: 'billing_cron' }, extra: { organizationId: org.id } });
      }
    }

    logger.info(TAG, `Billing run complete: ${result.totalInvoiced} invoiced, ${result.totalSkipped} skipped, ${result.totalFailed} failed`);
    return result;
  } catch (error: unknown) {
    const msg = getErrorMessage(error) || 'Unknown error';
    logger.error(TAG, `Billing run crashed: ${msg}`, error);
    Sentry.captureException(error, { tags: { layer: 'billing_cron' } });
    return { ...result, success: false, error: msg };
  }
}
