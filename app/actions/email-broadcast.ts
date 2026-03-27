'use server';

/**
 * Email Broadcast Server Actions
 * Ultra-perfectionist implementation for MISRAD AI
 */

import { logger } from '@/lib/server/logger';
import { requireSuperAdmin } from '@/lib/auth';
import { auth } from '@clerk/nextjs/server';
import prisma, { queryRawOrgScopedSql, executeRawOrgScopedSql } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { sendEmail } from '@/lib/email-sender';
import { generateBaseEmailTemplate } from '@/lib/email-templates';
import { isEmailOptedOut } from '@/lib/email-registry';

import type {
  CreateBroadcastPayload,
  CreateBroadcastResult,
  SendBroadcastResult,
  PreviewBroadcastResult,
  CancelBroadcastResult,
  BroadcastListItem,
  BroadcastDetail,
  BroadcastStats,
  BroadcastRecipientFilter,
  EmailBroadcastStatus,
  EmailRecipientStatus,
} from '@/types/email-broadcast';

const IS_PROD = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════════════════════════════════════════════
// Auth Helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function getCurrentOrganizationId(): Promise<string | null> {
  const session = await auth();
  const orgId = session.sessionClaims?.org_id as string | undefined;
  return orgId || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Recipient Resolution
// ═══════════════════════════════════════════════════════════════════════════════

interface TargetUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  plan: string | null;
  isSuperAdmin: boolean;
  notificationPreferences: Record<string, unknown>;
}

async function resolveTargetUsers(
  organizationId: string,
  filter: BroadcastRecipientFilter
): Promise<TargetUser[]> {
  const conditions: Prisma.Sql[] = [];

  if (filter.roles && filter.roles.length > 0) {
    conditions.push(Prisma.sql`role IN (${Prisma.join(filter.roles)})`);
  }

  if (filter.isActive !== undefined) {
    conditions.push(Prisma.sql`clerk_user_id IS NOT NULL`);
  }

  if (filter.specificUserIds && filter.specificUserIds.length > 0) {
    conditions.push(Prisma.sql`id IN (${Prisma.join(filter.specificUserIds)})`);
  }

  if (filter.excludeUserIds && filter.excludeUserIds.length > 0) {
    conditions.push(Prisma.sql`id NOT IN (${Prisma.join(filter.excludeUserIds)})`);
  }

  const whereClause = conditions.length > 0
    ? Prisma.sql`${Prisma.join(conditions, ' AND ')}`
    : Prisma.sql`1=1`;

  const rows = await queryRawOrgScopedSql<unknown[]>(prisma, {
    organizationId,
    reason: 'broadcast_resolve_recipients',
    sql: Prisma.sql`
      SELECT id, email, name, role, is_super_admin, notification_preferences
      FROM nexus_users
      WHERE organization_id = $organizationId$
        AND ${whereClause}
        AND email IS NOT NULL
        AND email != ''
      ORDER BY email
    `,
  });

  const users: TargetUser[] = [];
  for (const row of rows) {
    const r = asObject(row);
    if (!r) continue;

    const userId = String(r.id || '');
    const email = String(r.email || '');
    if (!userId || !email) continue;

    if (filter.notificationPreference) {
      const prefs = asObject(r.notification_preferences) || {};
      const key = filter.notificationPreference.key;
      const expectedValue = filter.notificationPreference.value;
      if (prefs[key] !== expectedValue) continue;
    }

    users.push({
      id: userId,
      email: email,
      name: r.name ? String(r.name) : null,
      role: r.role ? String(r.role) : null,
      plan: null,
      isSuperAdmin: Boolean(r.is_super_admin || false),
      notificationPreferences: asObject(r.notification_preferences) || {},
    });
  }

  if (filter.plans && filter.plans.length > 0) {
    const orgRow = await queryRawOrgScopedSql<unknown>(prisma, {
      organizationId,
      reason: 'broadcast_get_org_plan',
      sql: Prisma.sql`SELECT social_plan FROM organizations WHERE id = $organizationId$::uuid`,
    });

    const org = asObject(orgRow);
    const orgPlan = org ? String(org.social_plan || '') : '';

    if (!filter.plans.includes(orgPlan)) {
      return [];
    }
  }

  return users;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Create Broadcast
// ═══════════════════════════════════════════════════════════════════════════════

export async function createBroadcastEmail(
  payload: CreateBroadcastPayload
): Promise<CreateBroadcastResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'נדרשת התחברות' };
    }
    
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return { success: false, error: 'לא נמצא ארגון' };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return { success: false, error: 'אין הרשאה' };
    }

    const orgId = organizationId || '';
    if (!orgId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    // Shabbat Guard check
    const { isShabbatNow } = await import('@/lib/shabbat');
    const { isShabbat } = isShabbatNow();
    if (isShabbat) {
      return { success: false, error: 'מערכת מושבתת בשבת וחגים' };
    }

    if (!payload.subject?.trim()) {
      return { success: false, error: 'נושא המייל חסר' };
    }
    if (!payload.bodyHtml?.trim()) {
      return { success: false, error: 'תוכן המייל חסר' };
    }

    const targetUsers = await resolveTargetUsers(orgId, payload.recipientFilter);
    if (targetUsers.length === 0) {
      return { success: false, error: 'לא נמצאו נמענים תואמים' };
    }

    const isScheduled = payload.scheduledAt && new Date(payload.scheduledAt as string) > new Date();
    const status: EmailBroadcastStatus = isScheduled ? 'SCHEDULED' : 'DRAFT';

    const broadcastId = crypto.randomUUID();
    const now = new Date().toISOString();
    const scheduledAtIso = isScheduled && payload.scheduledAt ? new Date(payload.scheduledAt as string).toISOString() : null;

    await executeRawOrgScopedSql(prisma, {
      organizationId: orgId,
      reason: 'broadcast_create',
      sql: Prisma.sql`
        INSERT INTO email_broadcasts (
          id, organization_id, subject, body_html, body_text,
          from_name, from_email, reply_to,
          recipient_filter, target_count, status, scheduled_at,
          created_by, created_by_name,
          respect_preferences, include_unsubscribe, legal_category,
          created_at, updated_at
        ) VALUES (
          ${broadcastId}::uuid, ${orgId}::uuid,
          ${payload.subject}, ${payload.bodyHtml}, ${payload.bodyText || null},
          ${payload.fromName || 'MISRAD AI'}, ${payload.fromEmail || 'newsletter@misrad-ai.com'}, ${payload.replyTo || null},
          ${JSON.stringify(payload.recipientFilter)}::jsonb, ${targetUsers.length}, ${status}, ${scheduledAtIso}::timestamptz,
          ${userId || 'unknown'}, ${null},
          ${payload.respectPreferences !== false}, ${payload.includeUnsubscribe !== false}, ${payload.legalCategory || 'marketing'},
          ${now}::timestamptz, ${now}::timestamptz
        )
      `,
    });

    const recipientValues = targetUsers.map((user) =>
      Prisma.sql`(
        uuid_generate_v4(), ${broadcastId}::uuid, ${orgId}::uuid,
        ${user.id}::uuid, ${user.email}, ${user.name},
        'PENDING', ${now}::timestamptz, ${now}::timestamptz
      )`
    );

    if (recipientValues.length > 0) {
      await executeRawOrgScopedSql(prisma, {
        organizationId: orgId,
        reason: 'broadcast_create_recipients',
        sql: Prisma.sql`
          INSERT INTO email_broadcast_recipients (
            id, broadcast_id, organization_id, user_id, user_email, user_name,
            status, created_at, updated_at
          ) VALUES ${Prisma.join(recipientValues)}
        `,
      });
    }

    logger.info('email-broadcast', `Created broadcast ${broadcastId}`, { broadcastId, count: targetUsers.length });

    return { success: true, broadcastId, targetCount: targetUsers.length };
  } catch (error) {
    logger.error('email-broadcast', 'Error creating broadcast:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה ביצירה' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Preview Recipients
// ═══════════════════════════════════════════════════════════════════════════════

export async function previewBroadcastRecipients(
  filter: BroadcastRecipientFilter
): Promise<PreviewBroadcastResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'נדרשת התחברות' };
    }
    
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return { success: false, error: 'לא נמצא ארגון' };
    }

    const orgId = organizationId;
    if (!orgId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const users = await resolveTargetUsers(orgId, filter);

    return {
      success: true,
      targetUsers: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || undefined,
        role: u.role || undefined,
        plan: u.plan || undefined,
      })),
      count: users.length,
    };
  } catch (error) {
    logger.error('email-broadcast', 'Error previewing:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Send Broadcast
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendBroadcastEmail(broadcastId: string): Promise<SendBroadcastResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, sent: 0, failed: 0, skipped: 0, errors: ['נדרשת התחברות'] };
    }
    
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return { success: false, sent: 0, failed: 0, skipped: 0, errors: ['לא נמצא ארגון'] };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return { success: false, sent: 0, failed: 0, skipped: 0, errors: ['אין הרשאה'] };
    }

    const orgId = organizationId;
    if (!orgId) {
      return { success: false, sent: 0, failed: 0, skipped: 0, errors: ['ארגון לא נמצא'] };
    }

    const { isShabbatNow } = await import('@/lib/shabbat');
    const { isShabbat } = isShabbatNow();
    if (isShabbat) {
      return { success: false, sent: 0, failed: 0, skipped: 0, errors: ['מערכת מושבתת בשבת'] };
    }

    const broadcastRows = await queryRawOrgScopedSql<unknown[]>(prisma, {
      organizationId: orgId,
      reason: 'broadcast_get_for_send',
      sql: Prisma.sql`
        SELECT * FROM email_broadcasts
        WHERE id = ${broadcastId}::uuid AND organization_id = $organizationId$
          AND status IN ('DRAFT', 'SCHEDULED')
      `,
    });

    if (!broadcastRows.length) {
      return { success: false, sent: 0, failed: 0, skipped: 0, errors: ['לא נמצא'] };
    }

    const broadcast = asObject(broadcastRows[0]);
    if (!broadcast) {
      return { success: false, sent: 0, failed: 0, skipped: 0, errors: ['שגיאה'] };
    }

    await executeRawOrgScopedSql(prisma, {
      organizationId: orgId,
      reason: 'broadcast_update_status',
      sql: Prisma.sql`UPDATE email_broadcasts SET status = 'SENDING', updated_at = now() WHERE id = ${broadcastId}::uuid`,
    });

    const recipientRows = await queryRawOrgScopedSql<unknown[]>(prisma, {
      organizationId: orgId,
      reason: 'broadcast_get_recipients',
      sql: Prisma.sql`
        SELECT * FROM email_broadcast_recipients
        WHERE broadcast_id = ${broadcastId}::uuid AND status = 'PENDING'
      `,
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    const batchSize = 50;
    const recipients = recipientRows.map((r) => asObject(r)).filter(Boolean);

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      for (const recipient of batch) {
        if (!recipient) continue;
        const recId = String(recipient.id || '');
        const email = String(recipient.user_email || '');
        if (!email) { skipped++; continue; }

        if (broadcast.respect_preferences) {
          const legalCat = String(broadcast.legal_category || 'marketing');
          if (legalCat === 'marketing') {
            const prefs = asObject(recipient.notification_preferences) || {};
            if (isEmailOptedOut('marketing_newsletter', prefs)) {
              await executeRawOrgScopedSql(prisma, {
                organizationId: orgId,
                reason: 'broadcast_skip_prefs',
                sql: Prisma.sql`UPDATE email_broadcast_recipients SET status = 'SKIPPED', updated_at = now() WHERE id = ${recId}::uuid`,
              });
              skipped++;
              continue;
            }
          }
        }

        try {
          const html = generateBaseEmailTemplate({
            headerTitle: 'MISRAD AI',
            headerSubtitle: String(broadcast.subject || ''),
            bodyContent: String(broadcast.body_html || ''),
            showSocialLinks: false,
          });

          const result = await sendEmail({
            emailTypeId: 'marketing_newsletter',
            to: email,
            subject: String(broadcast.subject || ''),
            html,
            userPreferences: {},
          });

          if (result.success) {
            sent++;
            await executeRawOrgScopedSql(prisma, {
              organizationId: orgId,
              reason: 'broadcast_mark_sent',
              sql: Prisma.sql`UPDATE email_broadcast_recipients SET status = 'SENT', resend_message_id = ${result.messageId || null}, sent_at = now(), updated_at = now() WHERE id = ${recId}::uuid`,
            });
          } else {
            failed++;
            if (result.error) errors.push(result.error);
            await executeRawOrgScopedSql(prisma, {
              organizationId: orgId,
              reason: 'broadcast_mark_failed',
              sql: Prisma.sql`UPDATE email_broadcast_recipients SET status = 'FAILED', error_message = ${result.error || 'Unknown'}, updated_at = now() WHERE id = ${recId}::uuid`,
            });
          }
        } catch (err) {
          failed++;
          const msg = getErrorMessage(err);
          errors.push(msg);
          await executeRawOrgScopedSql(prisma, {
            organizationId: orgId,
            reason: 'broadcast_mark_exception',
            sql: Prisma.sql`UPDATE email_broadcast_recipients SET status = 'FAILED', error_message = ${msg}, updated_at = now() WHERE id = ${recId}::uuid`,
          });
        }
      }

      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const finalStatus: EmailBroadcastStatus = failed === recipients.length ? 'FAILED' : 'SENT';
    await executeRawOrgScopedSql(prisma, {
      organizationId: orgId,
      reason: 'broadcast_finalize',
      sql: Prisma.sql`
        UPDATE email_broadcasts
        SET status = ${finalStatus}, sent_count = ${sent}, failed_count = ${failed},
            sent_at = now(), updated_at = now(), error_log = ${JSON.stringify(errors.slice(0, 10))}::jsonb
        WHERE id = ${broadcastId}::uuid
      `,
    });

    return { success: sent > 0, sent, failed, skipped, errors: errors.slice(0, 5) };
  } catch (error) {
    logger.error('email-broadcast', 'Send error:', error);
    return { success: false, sent: 0, failed: 0, skipped: 0, errors: [getErrorMessage(error) || 'שגיאה'] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// List Broadcasts
// ═══════════════════════════════════════════════════════════════════════════════

export async function listBroadcastEmails(): Promise<{ success: boolean; broadcasts?: BroadcastListItem[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'נדרשת התחברות' };
    }
    
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return { success: false, error: 'לא נמצא ארגון' };
    }

    const orgId = organizationId;
    if (!orgId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const rows = await queryRawOrgScopedSql<unknown[]>(prisma, {
      organizationId: orgId,
      reason: 'broadcast_list',
      sql: Prisma.sql`
        SELECT id, subject, status, target_count, sent_count,
               delivered_count, opened_count, clicked_count,
               legal_category, created_at, sent_at, scheduled_at, created_by_name
        FROM email_broadcasts
        WHERE organization_id = $organizationId$
        ORDER BY created_at DESC
        LIMIT 100
      `,
    });

    const broadcasts: BroadcastListItem[] = rows.map((row) => {
      const r = asObject(row) || {};
      return {
        id: String(r.id || ''),
        subject: String(r.subject || ''),
        status: String(r.status || 'DRAFT') as EmailBroadcastStatus,
        targetCount: Number(r.target_count || 0),
        sentCount: Number(r.sent_count || 0),
        deliveredCount: Number(r.delivered_count || 0),
        openedCount: Number(r.opened_count || 0),
        clickedCount: Number(r.clicked_count || 0),
        legalCategory: String(r.legal_category || 'marketing'),
        createdAt: new Date(String(r.created_at || Date.now())),
        sentAt: r.sent_at ? new Date(String(r.sent_at)) : null,
        scheduledAt: r.scheduled_at ? new Date(String(r.scheduled_at)) : null,
        createdByName: r.created_by_name ? String(r.created_by_name) : null,
      };
    });

    return { success: true, broadcasts };
  } catch (error) {
    logger.error('email-broadcast', 'List error:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Get Detail
// ═══════════════════════════════════════════════════════════════════════════════

export async function getBroadcastDetail(broadcastId: string): Promise<{ success: boolean; broadcast?: BroadcastDetail; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'נדרשת התחברות' };
    }
    
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return { success: false, error: 'לא נמצא ארגון' };
    }

    const orgId = organizationId;
    if (!orgId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const rows = await queryRawOrgScopedSql<unknown[]>(prisma, {
      organizationId: orgId,
      reason: 'broadcast_detail',
      sql: Prisma.sql`SELECT * FROM email_broadcasts WHERE id = ${broadcastId}::uuid AND organization_id = $organizationId$`,
    });

    if (!rows.length) {
      return { success: false, error: 'לא נמצא' };
    }

    const b = asObject(rows[0]) || {};

    const recRows = await queryRawOrgScopedSql<unknown[]>(prisma, {
      organizationId: orgId,
      reason: 'broadcast_recipients_detail',
      sql: Prisma.sql`
        SELECT id, user_id, user_email, user_name, status, sent_at, delivered_at, opened_at, clicked_at, error_message
        FROM email_broadcast_recipients WHERE broadcast_id = ${broadcastId}::uuid ORDER BY created_at LIMIT 500
      `,
    });

    const recipients = recRows.map((row) => {
      const r = asObject(row) || {};
      return {
        id: String(r.id || ''),
        userId: String(r.user_id || ''),
        userEmail: String(r.user_email || ''),
        userName: r.user_name ? String(r.user_name) : null,
        status: String(r.status || 'PENDING') as EmailRecipientStatus,
        sentAt: r.sent_at ? new Date(String(r.sent_at)) : null,
        deliveredAt: r.delivered_at ? new Date(String(r.delivered_at)) : null,
        openedAt: r.opened_at ? new Date(String(r.opened_at)) : null,
        clickedAt: r.clicked_at ? new Date(String(r.clicked_at)) : null,
        errorMessage: r.error_message ? String(r.error_message) : null,
      };
    });

    const broadcast: BroadcastDetail = {
      id: String(b.id || ''),
      subject: String(b.subject || ''),
      status: String(b.status || 'DRAFT') as EmailBroadcastStatus,
      targetCount: Number(b.target_count || 0),
      sentCount: Number(b.sent_count || 0),
      deliveredCount: Number(b.delivered_count || 0),
      openedCount: Number(b.opened_count || 0),
      clickedCount: Number(b.clicked_count || 0),
      failedCount: Number(b.failed_count || 0),
      bouncedCount: Number(b.bounced_count || 0),
      unsubscribedCount: Number(b.unsubscribed_count || 0),
      legalCategory: String(b.legal_category || 'marketing'),
      createdAt: new Date(String(b.created_at || Date.now())),
      sentAt: b.sent_at ? new Date(String(b.sent_at)) : null,
      scheduledAt: b.scheduled_at ? new Date(String(b.scheduled_at)) : null,
      createdByName: b.created_by_name ? String(b.created_by_name) : null,
      bodyHtml: String(b.body_html || ''),
      bodyText: b.body_text ? String(b.body_text) : null,
      fromName: String(b.from_name || 'MISRAD AI'),
      fromEmail: String(b.from_email || 'newsletter@misrad-ai.com'),
      replyTo: b.reply_to ? String(b.reply_to) : null,
      recipientFilter: asObject(b.recipient_filter) || {},
      errorLog: asObject(b.error_log),
      recipients,
    };

    return { success: true, broadcast };
  } catch (error) {
    logger.error('email-broadcast', 'Detail error:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cancel Broadcast
// ═══════════════════════════════════════════════════════════════════════════════

export async function cancelBroadcastEmail(broadcastId: string): Promise<CancelBroadcastResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return { success: false, error: 'אין הרשאה' };
    }
    
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return { success: false, error: 'לא נמצא ארגון' };
    }

    const orgId = organizationId;
    if (!orgId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    await executeRawOrgScopedSql(prisma, {
      organizationId: orgId,
      reason: 'broadcast_cancel',
      sql: Prisma.sql`
        UPDATE email_broadcasts SET status = 'CANCELLED', updated_at = now()
        WHERE id = ${broadcastId}::uuid AND organization_id = $organizationId$ AND status IN ('DRAFT', 'SCHEDULED')
      `,
    });

    return { success: true };
  } catch (error) {
    logger.error('email-broadcast', 'Cancel error:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Delete Broadcast
// ═══════════════════════════════════════════════════════════════════════════════

export async function deleteBroadcastEmail(broadcastId: string): Promise<CancelBroadcastResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    try {
      await requireSuperAdmin();
    } catch {
      return { success: false, error: 'אין הרשאה' };
    }
    
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return { success: false, error: 'לא נמצא ארגון' };
    }

    const orgId = organizationId;
    if (!orgId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    await executeRawOrgScopedSql(prisma, {
      organizationId: orgId,
      reason: 'broadcast_delete',
      sql: Prisma.sql`DELETE FROM email_broadcasts WHERE id = ${broadcastId}::uuid AND organization_id = $organizationId$`,
    });

    return { success: true };
  } catch (error) {
    logger.error('email-broadcast', 'Delete error:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stats
// ═══════════════════════════════════════════════════════════════════════════════

export async function getBroadcastStats(): Promise<{ success: boolean; stats?: BroadcastStats; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'נדרשת התחברות' };
    }
    
    const organizationId = await getCurrentOrganizationId();
    if (!organizationId) {
      return { success: false, error: 'לא נמצא ארגון' };
    }

    const orgId = organizationId;
    if (!orgId) {
      return { success: false, error: 'ארגון לא נמצא' };
    }

    const rows = await queryRawOrgScopedSql<unknown[]>(prisma, {
      organizationId: orgId,
      reason: 'broadcast_stats',
      sql: Prisma.sql`SELECT status, COUNT(*) as count FROM email_broadcasts WHERE organization_id = $organizationId$ GROUP BY status`,
    });

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      const r = asObject(row);
      if (r) {
        const status = String(r.status || '');
        const count = Number(r.count || 0);
        byStatus[status] = count;
        total += count;
      }
    }

    const recentRows = await queryRawOrgScopedSql<unknown[]>(prisma, {
      organizationId: orgId,
      reason: 'broadcast_recent',
      sql: Prisma.sql`
        SELECT id, subject, status, target_count, sent_count, delivered_count, opened_count, clicked_count,
               legal_category, created_at, sent_at, scheduled_at, created_by_name
        FROM email_broadcasts WHERE organization_id = $organizationId$ ORDER BY created_at DESC LIMIT 5
      `,
    });

    const recent: BroadcastListItem[] = recentRows.map((row) => {
      const r = asObject(row) || {};
      return {
        id: String(r.id || ''),
        subject: String(r.subject || ''),
        status: String(r.status || 'DRAFT') as EmailBroadcastStatus,
        targetCount: Number(r.target_count || 0),
        sentCount: Number(r.sent_count || 0),
        deliveredCount: Number(r.delivered_count || 0),
        openedCount: Number(r.opened_count || 0),
        clickedCount: Number(r.clicked_count || 0),
        legalCategory: String(r.legal_category || 'marketing'),
        createdAt: new Date(String(r.created_at || Date.now())),
        sentAt: r.sent_at ? new Date(String(r.sent_at)) : null,
        scheduledAt: r.scheduled_at ? new Date(String(r.scheduled_at)) : null,
        createdByName: r.created_by_name ? String(r.created_by_name) : null,
      };
    });

    return { success: true, stats: { total, byStatus, recent } };
  } catch (error) {
    logger.error('email-broadcast', 'Stats error:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה' };
  }
}
