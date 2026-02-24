import 'server-only';

import prisma from '@/lib/prisma';
import { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import type { MisradNotificationType } from '@prisma/client';
import { sendWebPushNotificationToEmails } from '@/lib/server/web-push';

import { asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';

function toMisradNotificationType(value: unknown): MisradNotificationType {
  const v = String(value || '').toUpperCase();
  if (v === 'ALERT') return 'ALERT' as MisradNotificationType;
  if (v === 'MESSAGE') return 'MESSAGE' as MisradNotificationType;
  if (v === 'SUCCESS') return 'SUCCESS' as MisradNotificationType;
  if (v === 'TASK') return 'TASK' as MisradNotificationType;
  if (v === 'SYSTEM') return 'SYSTEM' as MisradNotificationType;
  return 'SYSTEM' as MisradNotificationType;
}

export type SystemNotificationDTO = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'financial';
  category: 'all' | 'leads' | 'finance' | 'system' | 'tasks';
  isRead: boolean;
  actionLabel?: string;
  link?: string | null;
};

function formatRelativeTime(createdAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 1) return 'כרגע';
  if (diffMin < 60) return `לפני ${diffMin} דק'`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `לפני ${diffHours} שעות`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    createdAt.getFullYear() === yesterday.getFullYear() &&
    createdAt.getMonth() === yesterday.getMonth() &&
    createdAt.getDate() === yesterday.getDate();

  const time = createdAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return `אתמול, ${time}`;

  const date = createdAt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  return `${date}, ${time}`;
}

function mapType(t: MisradNotificationType): SystemNotificationDTO['type'] {
  if (t === 'SUCCESS') return 'success';
  if (t === 'ALERT') return 'warning';
  if (t === 'TASK') return 'warning';
  if (t === 'MESSAGE') return 'info';
  return 'info';
}

function mapCategory(t: MisradNotificationType): SystemNotificationDTO['category'] {
  if (t === 'TASK') return 'tasks';
  return 'system';
}

export async function getSystemNotificationsForOrganizationId(params: {
  organizationId: string;
  recipientId: string;
  limit?: number;
}): Promise<SystemNotificationDTO[]> {
  const limit = Math.max(1, Math.min(200, Number(params.limit ?? 50)));

  const rows = await queryRawOrgScoped<unknown[]>(prisma, {
    organizationId: String(params.organizationId),
    reason: 'system_notifications_get',
    query: `
      select
        id::text as id,
        type,
        title,
        message,
        link,
        created_at,
        updated_at,
        is_read as "isRead"
      from misrad_notifications
      where organization_id = $1::uuid
        and recipient_id::text = $2::text
      order by created_at desc
      limit $3::int
    `,
    values: [String(params.organizationId), String(params.recipientId), limit],
  });

  return rows.map((r) => {
    const obj = asObject(r) ?? {};
    const createdAt = obj.created_at ? new Date(String(obj.created_at)) : new Date();
    const rawType = toMisradNotificationType(obj.type);
    const type = mapType(rawType);
    const category = mapCategory(rawType);

    return {
      id: String(obj.id ?? ''),
      title: String(obj.title || obj.type || ''),
      description: String(obj.message ?? ''),
      time: formatRelativeTime(createdAt),
      type,
      category,
      isRead: Boolean(obj.isRead),
      actionLabel: undefined,
      link: null,
    };
  });
}

export async function markSystemNotificationReadForOrganizationId(params: {
  organizationId: string;
  recipientId: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await executeRawOrgScoped(prisma, {
      organizationId: String(params.organizationId),
      reason: 'system_notifications_mark_read',
      query: `
        update misrad_notifications
        set is_read = true,
            updated_at = now()
        where organization_id = $1::uuid
          and recipient_id::text = $2::text
          and id::text = $3::text
      `,
      values: [String(params.organizationId), String(params.recipientId), String(params.id)],
    });

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה בסימון התראה כנקראה' };
  }
}

export async function markAllSystemNotificationsReadForOrganizationId(params: {
  organizationId: string;
  recipientId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await executeRawOrgScoped(prisma, {
      organizationId: String(params.organizationId),
      reason: 'system_notifications_mark_all_read',
      query: `
        update misrad_notifications
        set is_read = true,
            updated_at = now()
        where organization_id = $1::uuid
          and recipient_id::text = $2::text
          and is_read = false
      `,
      values: [String(params.organizationId), String(params.recipientId)],
    });

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה בסימון כל ההתראות כנקראו' };
  }
}

export async function deleteSystemNotificationForOrganizationId(params: {
  organizationId: string;
  recipientId: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await executeRawOrgScoped(prisma, {
      organizationId: String(params.organizationId),
      reason: 'system_notifications_delete',
      query: `
        delete from misrad_notifications
        where organization_id = $1::uuid
          and recipient_id::text = $2::text
          and id::text = $3::text
      `,
      values: [String(params.organizationId), String(params.recipientId), String(params.id)],
    });

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה במחיקת התראה' };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOTIFICATION_TYPE_TO_PUSH_CATEGORY: Record<string, 'alerts' | 'tasks' | 'events' | 'system' | 'marketing'> = {
  ALERT: 'alerts',
  TASK: 'tasks',
  MESSAGE: 'alerts',
  SUCCESS: 'system',
  SYSTEM: 'system',
  INVENTORY_ALERT: 'alerts',
  WORK_ORDER: 'tasks',
  LEAD: 'alerts',
  CLIENT: 'alerts',
  FINANCE: 'alerts',
};

// Map custom notification types to valid DB enum values (MisradNotificationType)
// The DB enum only supports: ALERT, MESSAGE, SUCCESS, TASK, SYSTEM
const CUSTOM_TYPE_TO_DB_ENUM: Record<string, string> = {
  LEAD: 'ALERT',
  CLIENT: 'MESSAGE',
  FINANCE: 'SUCCESS',
  INVENTORY_ALERT: 'ALERT',
  WORK_ORDER: 'TASK',
};

async function resolveEmailsAndSendPush(params: {
  organizationId: string;
  recipientIds: string[];
  type: string;
  text: string;
}): Promise<void> {
  const { organizationId, recipientIds, type, text } = params;
  if (!recipientIds.length) return;

  try {
    // recipientIds can be NexusUser IDs or OrganizationUser IDs — query both tables
    const [nexusRows, orgRows] = await Promise.all([
      prisma.nexusUser.findMany({
        where: { id: { in: recipientIds }, organizationId },
        select: { email: true },
      }).catch(() => [] as { email: string | null }[]),
      prisma.organizationUser.findMany({
        where: { id: { in: recipientIds }, organization_id: organizationId },
        select: { email: true },
      }).catch(() => [] as { email: string | null }[]),
    ]);

    const allRows = [...nexusRows, ...orgRows];
    const emails = Array.from(new Set(
      allRows
        .map((r) => String(r.email || '').trim().toLowerCase())
        .filter(Boolean)
    ));

    if (!emails.length) return;

    const category = NOTIFICATION_TYPE_TO_PUSH_CATEGORY[type] ?? 'system';

    await sendWebPushNotificationToEmails({
      organizationId,
      emails,
      payload: {
        title: 'MISRAD AI',
        body: text,
        url: '/',
        tag: `misrad-${type.toLowerCase()}-${Date.now()}`,
        category,
      },
    });
  } catch {
    // best-effort — push failure should never affect in-app notifications
  }
}

export async function insertMisradNotificationsForOrganizationId(params: {
  organizationId: string;
  recipientIds: string[];
  type: MisradNotificationType | string;
  text: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const organizationId = String(params.organizationId || '').trim();
    const text = String(params.text || '').trim();
    const originalType = String(params.type || '').trim().toUpperCase();
    const dbType = CUSTOM_TYPE_TO_DB_ENUM[originalType] || originalType;
    const reason = String(params.reason || '').trim();
    const recipientIds = Array.from(new Set((params.recipientIds || []).map((x) => String(x || '').trim()).filter((x) => UUID_RE.test(x))));

    if (!organizationId) return { ok: false, message: 'Missing organizationId' };
    if (!reason) return { ok: false, message: 'Missing reason' };
    if (!text) return { ok: true };
    if (!recipientIds.length) return { ok: true };

    await executeRawOrgScoped(prisma, {
      organizationId,
      reason,
      query: `
        insert into misrad_notifications (organization_id, recipient_id, type, title, message, "timestamp", is_read, created_at, updated_at)
        select $1::uuid, rid::uuid, $3::text, $4::text, $4::text, to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), false, now(), now()
        from unnest($2::uuid[]) as rid
      `,
      values: [organizationId, recipientIds, dbType, text],
    });

    // Fire-and-forget: also send web push notification to recipients
    // Use originalType for push category mapping (more specific than dbType)
    resolveEmailsAndSendPush({
      organizationId,
      recipientIds,
      type: originalType,
      text,
    }).catch(() => { /* best-effort — never block in-app notification */ });

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה ביצירת התראות' };
  }
}
