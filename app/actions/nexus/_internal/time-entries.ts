import 'server-only';

import { Prisma } from '@prisma/client';

import { hasPermission } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { isUuidLike as isUUID } from '@/lib/server/workspace-access/utils';

import type { TimeEntry } from '@/types';

import {
  createNexusTimeEntryRow,
  deleteNexusTimeEntryRowById,
  findNexusTimeEntryRow,
  listNexusTimeEntryRows,
  updateNexusTimeEntryRowById,
} from '@/lib/services/nexus-time-entries-service';

import { asObject, parseDateOnlyToDate } from './utils';
import { mapTimeEntryRow } from './mappers';

export async function voidNexusTimeEntry(params: {
  orgId: string;
  entryId: string;
  reason: string;
}): Promise<TimeEntry> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();

  const canManageTeam = await hasPermission('manage_team');

  const entryId = String(params.entryId || '').trim();
  if (!entryId) throw new Error('Entry ID is required');

  const entryRow = await findNexusTimeEntryRow({ organizationId: workspace.id, entryId });
  const entry = entryRow ? mapTimeEntryRow(entryRow) : null;
  if (!entry) throw new Error('Entry not found');

  if (entry.userId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const reason = String(params.reason || '').trim();
  if (!reason) throw new Error('Reason is required');

  const nowIso = new Date();
  const updatedCount = await updateNexusTimeEntryRowById({
    organizationId: workspace.id,
    entryId,
    data: {
      voidReason: reason,
      voidedBy: dbUserId,
      voidedAt: nowIso,
    },
  });
  if (!updatedCount.count) throw new Error('Failed to void time entry');

  const updatedRow = await findNexusTimeEntryRow({ organizationId: workspace.id, entryId });
  if (!updatedRow) throw new Error('Failed to void time entry');

  const updated = mapTimeEntryRow(updatedRow);
  logAuditEvent('data.write', 'time_entry', {
    resourceId: entryId,
    details: { action: 'void' },
    success: true,
  }).catch(() => null);

  return updated;
}

export async function listNexusTimeEntries(params: {
  orgId: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeVoided?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ timeEntries: TimeEntry[]; page: number; pageSize: number; hasMore: boolean }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();

  const canManageTeam = await hasPermission('manage_team');

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 50)));

  const requestedUserId = params.userId ? (isUUID(params.userId) ? params.userId : null) : null;
  if (params.userId && !requestedUserId) throw new Error('Invalid userId');

  if (requestedUserId && requestedUserId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const queryUserId = requestedUserId ? requestedUserId : canManageTeam ? undefined : dbUserId;

  const offset = (page - 1) * pageSize;
  const take = pageSize + 1;

  const where: Prisma.NexusTimeEntryWhereInput = {};
  if (queryUserId) where.userId = queryUserId;
  if (params.dateFrom || params.dateTo) {
    const dateFilter: Prisma.DateTimeFilter<'NexusTimeEntry'> = {};
    if (params.dateFrom) {
      const d = parseDateOnlyToDate(params.dateFrom);
      if (d) dateFilter.gte = d;
    }
    if (params.dateTo) {
      const d = parseDateOnlyToDate(params.dateTo);
      if (d) dateFilter.lte = d;
    }
    if (Object.keys(dateFilter).length) where.date = dateFilter;
  }
  if (!params.includeVoided) where.voidedAt = null;

  const rows = await listNexusTimeEntryRows({
    organizationId: workspace.id,
    where,
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    skip: offset,
    take,
  });

  const hasMore = rows.length > pageSize;
  const trimmed = hasMore ? rows.slice(0, pageSize) : rows;

  const timeEntries = trimmed.map(mapTimeEntryRow);

  logAuditEvent('data.read', 'time_entry', { success: true }).catch(() => null);

  return { timeEntries, page, pageSize, hasMore };
}

export async function createNexusTimeEntry(params: {
  orgId: string;
  input: Partial<TimeEntry> & { userId?: string };
}): Promise<TimeEntry> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();
  const requester = resolved.clerkUser;

  const canManageTeam = await hasPermission('manage_team');

  const body = params.input;
  const requestedUserId = typeof body.userId === 'string' && isUUID(body.userId) ? body.userId : null;
  if (requestedUserId && requestedUserId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const userId = requestedUserId || dbUserId;
  const now = new Date();
  const start = typeof body?.startTime === 'string' ? new Date(body.startTime) : now;
  const end = typeof body?.endTime === 'string' && body.endTime ? new Date(body.endTime) : null;
  const date = parseDateOnlyToDate(body?.date) ?? new Date(start.toISOString().slice(0, 10) + 'T00:00:00.000Z');
  const durationMinutes =
    typeof body?.durationMinutes === 'number'
      ? body.durationMinutes
      : end && end.getTime() > start.getTime()
        ? Math.round((end.getTime() - start.getTime()) / 60000)
        : 0;

  const createdRow = await createNexusTimeEntryRow({
    organizationId: workspace.id,
    userId,
    startTime: start,
    endTime: end,
    date,
    durationMinutes,
  });

  const entry = mapTimeEntryRow(createdRow);
  await logAuditEvent('data.write', 'time_entry', {
    resourceId: entry.id,
    details: { createdBy: requester.id },
    success: true,
  });

  return entry;
}

export async function updateNexusTimeEntry(params: {
  orgId: string;
  entryId: string;
  endTime?: string;
  updates?: Partial<TimeEntry> & { userId?: string };
}): Promise<TimeEntry> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();
  const requester = resolved.clerkUser;

  const canManageTeam = await hasPermission('manage_team');

  const entryId = String(params.entryId || '').trim();
  if (!entryId) throw new Error('Entry ID is required');

  const entryRow = await findNexusTimeEntryRow({ organizationId: workspace.id, entryId });
  const entry = entryRow ? mapTimeEntryRow(entryRow) : null;
  if (!entry || !entryRow) throw new Error('Entry not found');

  if (entry.userId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const updates = params.updates || {};
  const patch: Record<string, unknown> = {};

  if (updates.userId !== undefined) {
    if (!canManageTeam) throw new Error('Forbidden');
    patch.userId = String(updates.userId);
  }

  if (updates.date !== undefined) {
    patch.date = parseDateOnlyToDate(updates.date) ?? null;
  }

  if (updates.startTime !== undefined) {
    patch.startTime = updates.startTime ? new Date(String(updates.startTime)) : null;
  }

  const resolvedEndTime =
    updates.endTime !== undefined
      ? updates.endTime
        ? String(updates.endTime)
        : null
      : typeof params.endTime === 'string'
        ? params.endTime
        : undefined;

  if (resolvedEndTime !== undefined) {
    patch.endTime = resolvedEndTime ? new Date(String(resolvedEndTime)) : null;
  }

  const effectiveStart = patch.startTime ?? entryRow.startTime;
  const effectiveEnd = patch.endTime !== undefined ? patch.endTime : entryRow.endTime;
  if (effectiveEnd) {
    const startTimeMs = new Date(String(effectiveStart)).getTime();
    const endTimeMs = new Date(String(effectiveEnd)).getTime();
    patch.durationMinutes = endTimeMs > startTimeMs ? Math.round((endTimeMs - startTimeMs) / 60000) : 0;
  } else {
    patch.durationMinutes = 0;
  }

  const updatedCount = await updateNexusTimeEntryRowById({
    organizationId: workspace.id,
    entryId,
    data: patch as Prisma.NexusTimeEntryUpdateManyMutationInput,
  });
  if (!updatedCount.count) throw new Error('Failed to update time entry');

  const updatedRow = await findNexusTimeEntryRow({ organizationId: workspace.id, entryId });
  if (!updatedRow) throw new Error('Failed to update time entry');

  const updated = mapTimeEntryRow(updatedRow);

  await logAuditEvent('data.write', 'time_entry', {
    resourceId: entryId,
    details: { updatedBy: requester.id },
    success: true,
  });

  return updated;
}

export async function deleteNexusTimeEntry(params: {
  orgId: string;
  entryId: string;
}): Promise<{ ok: true }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const dbUser = asObject(resolved.user) ?? {};
  const dbUserId = String(dbUser.id ?? '').trim();
  const requester = resolved.clerkUser;

  const canManageTeam = await hasPermission('manage_team');

  const entryId = String(params.entryId || '').trim();
  if (!entryId) throw new Error('Entry ID is required');

  const entryRow = await findNexusTimeEntryRow({ organizationId: workspace.id, entryId });
  const entry = entryRow ? mapTimeEntryRow(entryRow) : null;
  if (!entry) throw new Error('Entry not found');

  if (entry.userId !== dbUserId && !canManageTeam) {
    throw new Error('Forbidden');
  }

  const res = await deleteNexusTimeEntryRowById({ organizationId: workspace.id, entryId });
  if (!res.count) throw new Error('Failed to delete time entry');

  await logAuditEvent('data.delete', 'time_entry', {
    resourceId: entryId,
    details: { deletedBy: requester.id },
    success: true,
  });

  return { ok: true };
}
