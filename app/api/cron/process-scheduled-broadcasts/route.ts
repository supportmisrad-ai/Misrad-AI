/**
 * Cron Job: Process Scheduled Email Broadcasts
 * POST /api/cron/process-scheduled-broadcasts
 *
 * Sends all email broadcasts that are scheduled for now or earlier.
 * Runs every 5 minutes.
 *
 * Security: Protected by cronGuard (CRON_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cronGuard } from '@/lib/api-cron-guard';
import { cronConnectionGuard } from '@/lib/api-cron-connection-guard';
import prisma, { queryRawOrgScopedSql, executeRawOrgScopedSql } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { sendEmail } from '@/lib/email-sender';
import { isEmailOptedOut } from '@/lib/email-registry';
import { logger } from '@/lib/server/logger';
import type { EmailBroadcastStatus, EmailRecipientStatus } from '@/types/email-broadcast';

interface ScheduledBroadcast {
  id: string;
  organization_id: string;
  subject: string;
  body_html: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  respect_preferences: boolean;
  include_unsubscribe: boolean;
  legal_category: string;
}

interface PendingRecipient {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  notification_preferences: Record<string, unknown> | null;
}

const BATCH_SIZE = 50;

async function POSTHandler(req: NextRequest): Promise<NextResponse> {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Find all scheduled broadcasts that should be sent now
    const broadcastRows = await prisma.$queryRaw<ScheduledBroadcast[]>`
      SELECT 
        id, organization_id, subject, body_html, from_name, from_email, reply_to,
        respect_preferences, include_unsubscribe, legal_category
      FROM email_broadcasts
      WHERE status = 'SCHEDULED'
        AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC
      LIMIT 10
    `;

    if (!broadcastRows || broadcastRows.length === 0) {
      return NextResponse.json({ success: true, message: 'No scheduled broadcasts to process', results }, { status: 200 });
    }

    logger.info('cron-broadcast', `Processing ${broadcastRows.length} scheduled broadcasts`);

    for (const broadcast of broadcastRows) {
      try {
        // Update status to SENDING
        await prisma.$executeRaw`
          UPDATE email_broadcasts 
          SET status = 'SENDING', updated_at = NOW()
          WHERE id = ${broadcast.id}::uuid
        `;

        // Get pending recipients
        const recipientRows = await prisma.$queryRaw<PendingRecipient[]>`
          SELECT id, user_id, user_email, user_name, notification_preferences
          FROM email_broadcast_recipients
          WHERE broadcast_id = ${broadcast.id}::uuid
            AND status IN ('PENDING', 'QUEUED')
          ORDER BY created_at ASC
          LIMIT ${BATCH_SIZE}
        `;

        if (!recipientRows || recipientRows.length === 0) {
          // No recipients to send - mark as SENT
          await prisma.$executeRaw`
            UPDATE email_broadcasts 
            SET status = 'SENT', sent_at = NOW(), updated_at = NOW()
            WHERE id = ${broadcast.id}::uuid
          `;
          results.processed++;
          continue;
        }

        // Process each recipient
        let broadcastSent = 0;
        let broadcastFailed = 0;
        let broadcastSkipped = 0;

        for (const recipient of recipientRows) {
          try {
            // Check notification preferences
            if (broadcast.respect_preferences && recipient.notification_preferences) {
              const prefs = recipient.notification_preferences as Record<string, boolean>;
              const emailType = broadcast.legal_category === 'marketing' ? 'marketing_newsletter' : 'system_updates';
              
              if (prefs[emailType] === false) {
                // User opted out
                await prisma.$executeRaw`
                  UPDATE email_broadcast_recipients
                  SET status = 'SKIPPED', updated_at = NOW(), error_message = 'User opted out'
                  WHERE id = ${recipient.id}::uuid
                `;
                results.skipped++;
                broadcastSkipped++;
                continue;
              }
            }

            // Check user preferences opt-out
            if (broadcast.respect_preferences && recipient.notification_preferences) {
              const prefs = recipient.notification_preferences as Record<string, boolean>;
              const emailType = broadcast.legal_category === 'marketing' ? 'marketing_newsletter' : 'system_updates';
              if (prefs[emailType] === false) {
                await prisma.$executeRaw`
                  UPDATE email_broadcast_recipients
                  SET status = 'SKIPPED', updated_at = NOW(), error_message = 'Global opt-out'
                  WHERE id = ${recipient.id}::uuid
                `;
                results.skipped++;
                broadcastSkipped++;
                continue;
              }
            }

            // Mark as SENDING
            await prisma.$executeRaw`
              UPDATE email_broadcast_recipients
              SET status = 'SENDING', updated_at = NOW()
              WHERE id = ${recipient.id}::uuid
            `;

            // Send the email
            const sendResult = await sendEmail({
              emailTypeId: broadcast.legal_category === 'marketing' ? 'marketing_newsletter' : 'system_broadcast',
              to: recipient.user_email,
              subject: broadcast.subject,
              html: broadcast.body_html,
              replyTo: broadcast.reply_to || undefined,
            });

            if (sendResult.success) {
              // Mark as SENT
              await prisma.$executeRaw`
                UPDATE email_broadcast_recipients
                SET status = 'SENT', sent_at = NOW(), resend_message_id = ${sendResult.messageId || null}, updated_at = NOW()
                WHERE id = ${recipient.id}::uuid
              `;
              results.sent++;
              broadcastSent++;
            } else {
              // Mark as FAILED
              await prisma.$executeRaw`
                UPDATE email_broadcast_recipients
                SET status = 'FAILED', error_message = ${sendResult.error || 'Unknown error'}, updated_at = NOW()
                WHERE id = ${recipient.id}::uuid
              `;
              results.failed++;
              broadcastFailed++;
              
              const errorMsg = `Failed to send to ${recipient.user_email}: ${sendResult.error}`;
              logger.error('cron-broadcast', errorMsg, { broadcastId: broadcast.id, recipientId: recipient.id });
              results.errors.push(errorMsg);
            }
          } catch (recipientError) {
            const errorMsg = recipientError instanceof Error ? recipientError.message : String(recipientError);
            await prisma.$executeRaw`
              UPDATE email_broadcast_recipients
              SET status = 'FAILED', error_message = ${errorMsg}, updated_at = NOW()
              WHERE id = ${recipient.id}::uuid
            `;
            results.failed++;
            broadcastFailed++;
            logger.error('cron-broadcast', 'Recipient processing error', { broadcastId: broadcast.id, recipientId: recipient.id, error: errorMsg });
            results.errors.push(`Recipient ${recipient.user_email}: ${errorMsg}`);
          }
        }

        // Update broadcast stats
        await prisma.$executeRaw`
          UPDATE email_broadcasts
          SET 
            sent_count = sent_count + ${broadcastSent},
            failed_count = failed_count + ${broadcastFailed},
            updated_at = NOW()
          WHERE id = ${broadcast.id}::uuid
        `;

        // Check if all recipients are processed
        const pendingCount = await prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(*) as count
          FROM email_broadcast_recipients
          WHERE broadcast_id = ${broadcast.id}::uuid
            AND status IN ('PENDING', 'QUEUED')
        `;

        if (!pendingCount || pendingCount[0].count === 0) {
          // All done - mark as SENT
          await prisma.$executeRaw`
            UPDATE email_broadcasts 
            SET status = 'SENT', sent_at = NOW(), updated_at = NOW()
            WHERE id = ${broadcast.id}::uuid
          `;
        }

        results.processed++;
        logger.info('cron-broadcast', `Broadcast ${broadcast.id} processed: ${broadcastSent} sent, ${broadcastFailed} failed, ${broadcastSkipped} skipped`);

      } catch (broadcastError) {
        const errorMsg = broadcastError instanceof Error ? broadcastError.message : String(broadcastError);
        logger.error('cron-broadcast', `Broadcast processing error: ${errorMsg}`, { broadcastId: broadcast.id });
        results.errors.push(`Broadcast ${broadcast.id}: ${errorMsg}`);
        
        // Mark broadcast as FAILED
        await prisma.$executeRaw`
          UPDATE email_broadcasts 
          SET status = 'FAILED', updated_at = NOW()
          WHERE id = ${broadcast.id}::uuid
        `;
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `Processed ${results.processed} broadcasts`,
        results 
      }, 
      { status: 200 }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('cron-broadcast', `Cron job error: ${errorMsg}`, error);
    return NextResponse.json(
      { success: false, error: errorMsg, results },
      { status: 500 }
    );
  }
}

export const POST = cronGuard(cronConnectionGuard(POSTHandler, { critical: true, maxConcurrent: 1 }));
