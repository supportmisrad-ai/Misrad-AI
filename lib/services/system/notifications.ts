import 'server-only';

import prisma from '@/lib/prisma';
import { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import type { MisradNotificationType } from '@prisma/client';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getUnknownErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : null;
}

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
        text,
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
      title: String(obj.type ?? ''),
      description: String(obj.text ?? ''),
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
