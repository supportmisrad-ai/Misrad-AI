'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUi } from '@/lib/server/workspaceUser';
import { Prisma } from '@prisma/client';
import type { MisradNotificationType } from '@prisma/client';

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

async function resolveMisradNotificationsReadColumn(): Promise<'is_read' | 'isRead' | null> {
  try {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>(Prisma.sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'misrad_notifications'
    `);
    const names = new Set((rows || []).map((r) => String(r.column_name)));
    if (names.has('is_read')) return 'is_read';
    if (names.has('isRead')) return 'isRead';
    return null;
  } catch {
    return null;
  }
}

export async function getSystemNotifications(params: {
  orgSlug: string;
  limit?: number;
}): Promise<SystemNotificationDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);

  const limit = Math.max(1, Math.min(200, Number(params.limit ?? 50)));

  const readColumn = await resolveMisradNotificationsReadColumn();

  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    select
      id,
      title,
      message,
      link,
      type,
      timestamp,
      created_at,
      updated_at,
      ${readColumn ? Prisma.raw(`"${readColumn}"`) : Prisma.sql`false`} as "isRead"
    from misrad_notifications
    where organization_id::text = ${String(workspace.id)}
      and recipient_id::text = ${String(currentUser.id)}
    order by created_at desc
    limit ${limit}
  `);

  return rows.map((r) => {
    const createdAt = r.created_at ? new Date(r.created_at) : new Date();
    const type = mapType(r.type);
    const category = mapCategory(r.type);

    return {
      id: String(r.id),
      title: String(r.title || ''),
      description: String(r.message || ''),
      time: formatRelativeTime(createdAt),
      type,
      category,
      isRead: Boolean(r.isRead),
      actionLabel: r.link ? 'פתח' : undefined,
      link: r.link ? String(r.link) : null,
    };
  });
}

export async function markSystemNotificationRead(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);

    const readColumn = await resolveMisradNotificationsReadColumn();

    if (readColumn) {
      await prisma.$executeRaw(Prisma.sql`
        update misrad_notifications
        set ${Prisma.raw(`"${readColumn}"`)} = true,
            updated_at = now()
        where id::text = ${String(params.id)}
          and organization_id::text = ${String(workspace.id)}
          and recipient_id::text = ${String(currentUser.id)}
      `);
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה בסימון התראה כנקראה' };
  }
}

export async function markAllSystemNotificationsRead(params: {
  orgSlug: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);

    const readColumn = await resolveMisradNotificationsReadColumn();

    if (readColumn) {
      await prisma.$executeRaw(Prisma.sql`
        update misrad_notifications
        set ${Prisma.raw(`"${readColumn}"`)} = true,
            updated_at = now()
        where organization_id::text = ${String(workspace.id)}
          and recipient_id::text = ${String(currentUser.id)}
          and ${Prisma.raw(`"${readColumn}"`)} = false
      `);
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה בסימון כל ההתראות כנקראו' };
  }
}

export async function deleteSystemNotification(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const currentUser = await resolveWorkspaceCurrentUserForUi(params.orgSlug);

    await prisma.$executeRaw(Prisma.sql`
      delete from misrad_notifications
      where id::text = ${String(params.id)}
        and organization_id::text = ${String(workspace.id)}
        and recipient_id::text = ${String(currentUser.id)}
    `);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה במחיקת התראה' };
  }
}
