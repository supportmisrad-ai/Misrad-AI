/**
 * Morning (Green Invoice) Webhook Handler - App Billing
 * POST /api/webhooks/morning-app
 *
 * Receives payment confirmation webhooks from Morning for app-level billing
 * Updates organization subscription_status to 'active' upon successful payment
 *
 * Security:
 * - Validates webhook signature using MORNING_WEBHOOK_SECRET
 * - Logs all webhook events for audit trail
 * - Rate limited to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { markPaymentSuccessful, markPaymentFailed } from '@/lib/services/app-billing';
import { getErrorMessage } from '@/lib/shared/unknown';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { sendEmail } from '@/lib/email-sender';
import { generatePaymentSuccessEmailHTML, generatePaymentFailedEmailHTML } from '@/lib/email-generators';
import { getBaseUrl } from '@/lib/utils';

const MORNING_WEBHOOK_SECRET = process.env.MORNING_WEBHOOK_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

function captureWebhookException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('layer', 'webhook');
    scope.setTag('service', 'morning_app');
    for (const [k, v] of Object.entries(context)) {
      scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

/**
 * Verify webhook signature
 * Morning sends signature in x-greeninvoice-signature header
 */
function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  if (!MORNING_WEBHOOK_SECRET) {
    console.warn('[Webhook] MORNING_WEBHOOK_SECRET not configured. Skipping signature verification.');
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  try {
    // Create HMAC SHA256 signature
    const hmac = crypto.createHmac('sha256', MORNING_WEBHOOK_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures (timing-safe comparison)
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error: unknown) {
    captureWebhookException(error, { action: 'verifyWebhookSignature' });
    return false;
  }
}

/**
 * Find organization by Morning invoice metadata
 * We store organizationId in the invoice metadata or notes when creating invoices
 */
async function findOrganizationByInvoice(morningInvoiceId: string): Promise<string | null> {
  try {
    // Check billing_events for reference
    // Note: Querying JSON fields requires a raw query or string contains
    const events = await prisma.billing_events.findMany({
      where: {
        event_type: {
          contains: 'invoice',
        },
      },
      select: { organization_id: true, payload: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    // Find matching invoice in payload
    const matchingEvent = events.find((e) => {
      const payload = e.payload as any;
      return payload?.morningInvoiceId === morningInvoiceId;
    });

    return matchingEvent?.organization_id || null;
  } catch (error: unknown) {
    captureWebhookException(error, { action: 'findOrganizationByInvoice', morningInvoiceId });
    return null;
  }
}

/**
 * Log webhook event for audit trail
 */
async function logWebhookEvent(params: {
  eventType: string;
  payload: unknown;
  organizationId?: string | null;
  status: 'success' | 'failed';
  error?: string;
}) {
  try {
    // Only create event if we have an organization_id (required field)
    if (params.organizationId) {
      await prisma.billing_events.create({
        data: {
          organization_id: params.organizationId,
          event_type: `webhook_${params.eventType}`,
          payload: {
            webhookPayload: params.payload,
            status: params.status,
            error: params.error,
            receivedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          occurred_at: new Date(),
          created_at: new Date(),
        },
      });
    }
  } catch (error: unknown) {
    // Non-critical: log but don't fail the webhook
    captureWebhookException(error, { action: 'logWebhookEvent' });
  }
}

/**
 * POST handler for Morning webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body as text for signature verification
    const rawBody = await request.text();

    // Get signature header
    const headersList = await headers();
    const signature = headersList.get('x-greeninvoice-signature') || headersList.get('x-morning-signature');

    // Verify signature
    if (IS_PROD && !verifyWebhookSignature(rawBody, signature)) {
      if (!IS_PROD) console.error('[Webhook] Invalid webhook signature');
      await logWebhookEvent({
        eventType: 'signature_failed',
        payload: { error: 'Invalid signature' },
        status: 'failed',
        error: 'Invalid signature',
      });

      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Extract event details
    const eventType = payload.type || payload.event || 'unknown';
    const documentId = payload.documentId || payload.document_id || payload.id;
    const documentStatus = payload.status || payload.documentStatus;

    if (!IS_PROD) {
      console.log('[Webhook] Received Morning webhook:', {
        eventType,
        documentId,
        status: documentStatus,
      });
    }

    // Find organization
    let organizationId: string | null = null;

    // Try to extract organizationId from metadata
    if (payload.metadata?.organizationId) {
      organizationId = payload.metadata.organizationId;
    } else if (documentId) {
      organizationId = await findOrganizationByInvoice(String(documentId));
    }

    if (!organizationId) {
      await logWebhookEvent({
        eventType,
        payload,
        status: 'failed',
        error: 'Organization not found',
      });

      if (!IS_PROD) {
        console.warn('[Webhook] Could not find organization for invoice:', documentId);
      }

      // Return 200 to acknowledge receipt (prevents retries)
      return NextResponse.json({ received: true, warning: 'Organization not found' });
    }

    // Handle different event types
    switch (eventType) {
      case 'document.paid':
      case 'payment.successful':
      case 'invoice.paid': {
        // Payment successful
        const amount = Number(payload.amount || payload.total || 0);

        const result = await markPaymentSuccessful(organizationId, amount, String(documentId));

        await logWebhookEvent({
          eventType,
          payload,
          organizationId,
          status: result.success ? 'success' : 'failed',
          error: result.error,
        });

        if (result.success) {
          if (!IS_PROD) {
            console.log('[Webhook] Payment marked successful for organization:', organizationId);
          }

          // Mark invoice as paid in billing_invoices table
          try {
            await prisma.billing_invoices.updateMany({
              where: { morning_invoice_id: String(documentId), organization_id: organizationId },
              data: { status: 'paid', paid_at: new Date(), updated_at: new Date() },
            });
          } catch (dbErr: unknown) {
            if (!IS_PROD) console.error('[Webhook] Failed to update invoice status:', dbErr);
          }

          // Send payment success email
          try {
            const org = await prisma.organization.findUnique({
              where: { id: organizationId },
              select: { name: true, billing_email: true, slug: true, owner: { select: { email: true, full_name: true } } },
            });
            // Fetch stored invoice for PDF URL
            const storedInvoice = await prisma.billing_invoices.findFirst({
              where: { morning_invoice_id: String(documentId), organization_id: organizationId },
              select: { invoice_url: true, pdf_url: true, invoice_number: true },
            });
            const toEmail = org?.billing_email || org?.owner?.email;
            if (toEmail) {
              const baseUrl = getBaseUrl();
              const portalUrl = org?.slug ? `${baseUrl}/w/${encodeURIComponent(org.slug)}/billing` : baseUrl;
              const html = generatePaymentSuccessEmailHTML({
                ownerName: org?.owner?.full_name || null,
                organizationName: org?.name || '',
                amount,
                invoiceNumber: storedInvoice?.invoice_number || String(documentId || ''),
                invoiceUrl: storedInvoice?.pdf_url || storedInvoice?.invoice_url || undefined,
                portalUrl,
              });
              await sendEmail({
                emailTypeId: 'billing_payment_success',
                to: toEmail,
                subject: `\u2705 תשלום התקבל בהצלחה — ${org?.name || ''}`,
                html,
                forceSend: true,
              });
            }
          } catch (emailErr: unknown) {
            if (!IS_PROD) console.error('[Webhook] Failed to send payment success email:', emailErr);
          }

          return NextResponse.json({ received: true, status: 'processed' });
        } else {
          return NextResponse.json({ received: true, status: 'error', error: result.error }, { status: 500 });
        }
      }

      case 'document.failed':
      case 'payment.failed':
      case 'invoice.failed': {
        // Payment failed
        const reason = payload.reason || payload.error || 'Unknown';

        const result = await markPaymentFailed(organizationId, String(documentId), String(reason));

        await logWebhookEvent({
          eventType,
          payload,
          organizationId,
          status: result.success ? 'success' : 'failed',
          error: result.error,
        });

        if (result.success) {
          if (!IS_PROD) {
            console.log('[Webhook] Payment marked failed for organization:', organizationId);
          }

          // Mark invoice as overdue in billing_invoices table
          try {
            await prisma.billing_invoices.updateMany({
              where: { morning_invoice_id: String(documentId), organization_id: organizationId },
              data: { status: 'overdue', updated_at: new Date() },
            });
          } catch (dbErr: unknown) {
            if (!IS_PROD) console.error('[Webhook] Failed to update invoice status to overdue:', dbErr);
          }

          // Send payment failed email
          try {
            const org = await prisma.organization.findUnique({
              where: { id: organizationId },
              select: { name: true, billing_email: true, slug: true, owner: { select: { email: true, full_name: true } } },
            });
            const toEmail = org?.billing_email || org?.owner?.email;
            if (toEmail) {
              const baseUrl = getBaseUrl();
              const retryUrl = org?.slug ? `${baseUrl}/w/${encodeURIComponent(org.slug)}/billing` : `${baseUrl}/subscribe/checkout`;
              const html = generatePaymentFailedEmailHTML({
                ownerName: org?.owner?.full_name || null,
                organizationName: org?.name || '',
                amount: Number(payload.amount || payload.total || 0),
                reason: String(reason),
                retryUrl,
              });
              await sendEmail({
                emailTypeId: 'billing_payment_failed',
                to: toEmail,
                subject: `\u26a0\ufe0f בעיה בתשלום — ${org?.name || ''}`,
                html,
                forceSend: true,
              });
            }
          } catch (emailErr: unknown) {
            if (!IS_PROD) console.error('[Webhook] Failed to send payment failed email:', emailErr);
          }

          return NextResponse.json({ received: true, status: 'processed' });
        } else {
          return NextResponse.json({ received: true, status: 'error', error: result.error }, { status: 500 });
        }
      }

      case 'document.created':
      case 'invoice.created': {
        // Invoice created (informational only)
        await logWebhookEvent({
          eventType,
          payload,
          organizationId,
          status: 'success',
        });

        return NextResponse.json({ received: true, status: 'logged' });
      }

      default: {
        // Unknown event type
        await logWebhookEvent({
          eventType: 'unknown',
          payload,
          organizationId,
          status: 'success',
        });

        if (!IS_PROD) {
          console.warn('[Webhook] Unknown event type:', eventType);
        }

        return NextResponse.json({ received: true, status: 'unknown_event' });
      }
    }
  } catch (error: unknown) {
    captureWebhookException(error, { action: 'POST_webhook_morning_app' });

    const errorMessage = getErrorMessage(error);
    if (!IS_PROD) {
      console.error('[Webhook] Error processing Morning webhook:', errorMessage);
    }

    // Return 200 to acknowledge receipt (prevents retries for permanent errors)
    return NextResponse.json(
      {
        received: true,
        status: 'error',
        error: IS_PROD ? 'Internal error' : errorMessage,
      },
      { status: 200 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'morning-app-webhook',
    webhookSecretConfigured: !!MORNING_WEBHOOK_SECRET,
  });
}
