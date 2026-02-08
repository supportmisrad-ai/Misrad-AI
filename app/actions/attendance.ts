'use server';

import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import prisma from '@/lib/prisma';

import { asObject } from '@/lib/shared/unknown';
function getStringProp(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function getActiveShift(orgSlugOrId: string) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;

  const row = await prisma.nexusTimeEntry.findFirst({
    where: {
      organizationId: String(workspace.id),
      userId: String(dbUser.id),
      endTime: null,
    },
    orderBy: { startTime: 'desc' },
    select: { id: true, startTime: true },
  });

  if (!row?.id) {
    return { activeShift: null as null | { id: string; startTime: string } };
  }

  return {
    activeShift: {
      id: String(row.id),
      startTime: row.startTime instanceof Date ? row.startTime.toISOString() : String(row.startTime),
    },
  };
}

export async function punchIn(orgSlugOrId: string, note?: string) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;

  const existing = await getActiveShift(String(orgSlugOrId));
  if (existing.activeShift) {
    return { success: true, activeShift: existing.activeShift, alreadyActive: true };
  }

  const now = new Date();

  const dateOnly = toIsoDate(now);
  const createdRow = await prisma.nexusTimeEntry.create({
    data: {
      organizationId: String(workspace.id),
      userId: String(dbUser.id),
      startTime: now,
      endTime: null,
      date: new Date(dateOnly),
      durationMinutes: null,
      voidReason: typeof note === 'string' && note.trim().length > 0 ? note.trim() : null,
      voidedBy: null,
      voidedAt: null,
    },
    select: { id: true, startTime: true },
  });

  if (!createdRow?.id) {
    throw new Error('Failed to punch in');
  }

  const entry = {
    id: String(createdRow.id),
    startTime: createdRow.startTime instanceof Date ? createdRow.startTime.toISOString() : String(createdRow.startTime),
  };

  return {
    success: true,
    activeShift: { id: String(entry.id), startTime: String(entry.startTime) },
    alreadyActive: false,
  };
}

export async function punchOut(orgSlugOrId: string, note?: string) {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;

  const existing = await getActiveShift(String(orgSlugOrId));
  if (!existing.activeShift) {
    return { success: true, closed: false, noActiveShift: true };
  }

  const now = new Date();
  const endTime = now.toISOString();
  const startTimeMs = new Date(existing.activeShift.startTime).getTime();
  const endTimeMs = now.getTime();
  const durationMinutes = endTimeMs > startTimeMs ? Math.round((endTimeMs - startTimeMs) / 60000) : 0;

  const res = await prisma.nexusTimeEntry.updateMany({
    where: {
      id: String(existing.activeShift.id),
      organizationId: String(workspace.id),
      userId: String(resolved.user.id),
    },
    data: {
      endTime: new Date(endTime),
      durationMinutes,
      voidReason: typeof note === 'string' && note.trim().length > 0 ? note.trim() : null,
    },
  });

  if (!res.count) {
    throw new Error('Failed to punch out');
  }

  return { success: true, closed: true, entryId: existing.activeShift.id, noActiveShift: false };
}
