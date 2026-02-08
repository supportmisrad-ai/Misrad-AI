import 'server-only';

import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

import { createActionMetrics } from '@/lib/server/action-metrics';
import { isUuidLike as isUUID } from '@/lib/server/workspace-access/utils';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { insertMisradNotificationsForOrganizationId } from '@/lib/services/system/notifications';
import { resolveNexusTasksAttachmentsForResponse } from '@/lib/services/nexus-task-attachments';
import {
  createNexusTaskRow,
  deleteNexusTaskRowsById,
  findNexusTaskRow,
  listNexusTaskRows,
  updateNexusTaskRowsById,
} from '@/lib/services/nexus-tasks-service';
import { canAccessResource, hasPermission, requirePermission } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import type { Task } from '@/types';

import {
  asObject,
  getErrorMessage,
  parseDateOnlyToDate,
  parseTimeHHmmToDate,
  safeToInputJsonValue,
} from './utils';
import { toTaskDto } from './mappers';
import { normalizeMessagesForStorage, resolveTaskAttachmentsForResponse } from './storage';

export async function listNexusTasks(params: {
  orgId: string;
  taskId?: string;
  assigneeId?: string;
  status?: string;
  leadId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ tasks: Task[]; page: number; pageSize: number; hasMore: boolean }> {
  const metrics = createActionMetrics('nexus.listNexusTasks', { orgId: params.orgId });
  const extra: Record<string, unknown> = {};

  try {
    const { orgId, taskId, assigneeId, status } = params;
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Math.floor(params.pageSize ?? 50)));
    const offset = (page - 1) * pageSize;
    const take = pageSize + 1;

    const resolved = await metrics.step('auth.resolveWorkspaceCurrentUserForApi', () =>
      resolveWorkspaceCurrentUserForApi(orgId)
    );
    const workspace = resolved.workspace;
    const dbUser = asObject(resolved.user) ?? {};
    const dbUserId = String(dbUser.id ?? '').trim();

    await metrics.step('auth.requirePermission.view_crm', () => requirePermission('view_crm'));

    const isManager = await metrics.step('auth.hasPermission.manage_team', () => hasPermission('manage_team'));

    const where: Omit<Prisma.NexusTaskWhereInput, 'organizationId'> = {};

    if (taskId) {
      where.id = taskId;
    }

    if (status) {
      where.status = status;
    } else if (!taskId) {
      where.status = { notIn: ['Done', 'done'] };
    }

    if (assigneeId) {
      where.OR = [{ assigneeId }, { assigneeIds: { has: assigneeId } }];
    } else if (!taskId && !isManager && dbUserId) {
      where.OR = [{ assigneeId: dbUserId }, { assigneeIds: { has: dbUserId } }, { creatorId: dbUserId }];
    }

    const rows = await metrics.step('db.nexusTask.findMany', () =>
      listNexusTaskRows({
        organizationId: workspace.id,
        where,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: offset,
        take,
      })
    );

    const hasMore = rows.length > pageSize;
    const trimmed = hasMore ? rows.slice(0, pageSize) : rows;
    extra.rowsCount = rows.length;

    const baseTasks = trimmed.map((row) => toTaskDto(row));
    const tasks = await metrics.step('storage.resolveTaskAttachments', () =>
      resolveNexusTasksAttachmentsForResponse(baseTasks, { organizationId: workspace.id, orgSlug: workspace.slug })
    );
    extra.tasksCount = tasks.length;

    logAuditEvent('data.read', 'task', { success: true }).catch(() => null);

    return { tasks, page, pageSize, hasMore };
  } catch (e: unknown) {
    extra.error = getErrorMessage(e) || null;
    throw e;
  } finally {
    metrics.flush(extra);
  }
}

export async function createNexusTask(params: {
  orgId: string;
  input: (Omit<Task, 'id'> & { leadId?: string | null }) & { id?: string | null };
}): Promise<Task> {
  const metrics = createActionMetrics('nexus.createNexusTask', { orgId: params.orgId });
  const extra: Record<string, unknown> = {};

  try {
    const resolved = await metrics.step('auth.resolveWorkspaceCurrentUserForApi', () =>
      resolveWorkspaceCurrentUserForApi(params.orgId)
    );
    const workspace = resolved.workspace;
    const user = resolved.clerkUser;
    const dbUser = asObject(resolved.user) ?? {};
    const dbUserId = String(dbUser.id ?? '').trim();

    await metrics.step('auth.requirePermission.view_crm', () => requirePermission('view_crm'));

    const body = params.input;
    if (!body?.title) throw new Error('Title is required');

    const creatorId = typeof body.creatorId === 'string' && isUUID(body.creatorId) ? body.creatorId : dbUserId;

    const assigneeIdsRaw = Array.isArray(body.assigneeIds) ? body.assigneeIds : [];
    const assigneeIds = assigneeIdsRaw.filter((id): id is string => typeof id === 'string' && isUUID(id));
    let assigneeId = typeof body.assigneeId === 'string' && isUUID(body.assigneeId) ? body.assigneeId : undefined;

    if (assigneeId && !assigneeIds.includes(assigneeId)) assigneeIds.push(assigneeId);
    if (!assigneeIds.length) {
      assigneeIds.push(dbUserId);
      assigneeId = dbUserId;
    }

    const ensuredTaskId =
      typeof body.id === 'string' && String(body.id).trim() ? String(body.id).trim() : randomUUID();

    const createdRow = await metrics.step('db.nexusTask.create', () =>
      createNexusTaskRow({
        data: {
          id: ensuredTaskId,
          organizationId: workspace.id,
          title: String(body.title),
          description: body.description ? String(body.description) : null,
          status: String(body.status || 'Todo'),
          priority: body.priority ? String(body.priority) : null,
          assigneeIds,
          assigneeId: assigneeId || null,
          creatorId: creatorId || null,
          tags: Array.isArray(body.tags) ? body.tags : [],
          createdAt: typeof body.createdAt === 'string' ? new Date(body.createdAt) : new Date(),
          dueDate: parseDateOnlyToDate(body.dueDate) ?? null,
          dueTime: parseTimeHHmmToDate(body.dueTime) ?? null,
          timeSpent: Number(body.timeSpent ?? 0),
          estimatedTime: body.estimatedTime ?? null,
          approvalStatus: body.approvalStatus ?? null,
          isTimerRunning: Boolean(body.isTimerRunning),
          messages: normalizeMessagesForStorage(body.messages || []),
          clientId: body.clientId ?? null,
          isPrivate: Boolean(body.isPrivate),
          audioUrl: body.audioUrl ?? null,
          snoozeCount: body.snoozeCount ?? 0,
          isFocus: Boolean(body.isFocus),
          completionDetails: safeToInputJsonValue(body.completionDetails),
          department: body.department ?? user.role ?? null,
        },
      })
    );

    const createdTask = await metrics.step('storage.resolveTaskAttachments', () =>
      resolveTaskAttachmentsForResponse(toTaskDto(createdRow), {
        organizationId: workspace.id,
        orgSlug: workspace.slug,
      })
    );
    extra.taskId = createdTask.id;

    logAuditEvent('data.write', 'task', { resourceId: createdTask.id, details: { createdBy: user.id } }).catch(
      () => null
    );

    try {
      const recipients = assigneeIds.filter((assignee: string) => assignee !== creatorId);
      await metrics.step('notifications.insert_assigned', async () => {
        await insertMisradNotificationsForOrganizationId({
          organizationId: workspace.id,
          recipientIds: recipients,
          type: 'TASK',
          text: `שויכת למשימה: ${createdTask.title}`,
          reason: 'nexus_task_notification_assigned',
        });
      });
    } catch {
      // ignore
    }

    return createdTask;
  } catch (e: unknown) {
    extra.error = getErrorMessage(e) || null;
    throw e;
  } finally {
    metrics.flush(extra);
  }
}

export async function updateNexusTask(params: {
  orgId: string;
  taskId: string;
  updates: Partial<Task>;
}): Promise<Task> {
  const metrics = createActionMetrics('nexus.updateNexusTask', { orgId: params.orgId, taskId: params.taskId });
  const extra: Record<string, unknown> = {};

  try {
    const resolved = await metrics.step('auth.resolveWorkspaceCurrentUserForApi', () =>
      resolveWorkspaceCurrentUserForApi(params.orgId)
    );
    const workspace = resolved.workspace;
    const user = resolved.clerkUser;

    const taskId = String(params.taskId || '').trim();
    if (!taskId) throw new Error('Task ID is required');

    const isSuperAdmin = user?.isSuperAdmin === true;
    const canAccess = isSuperAdmin
      ? true
      : await metrics.step('auth.canAccessResource.task.write', () =>
          canAccessResource('task', taskId, 'write', { organizationId: workspace.id })
        );
    if (!canAccess) throw new Error('Forbidden');

    const existingRow = await metrics.step('db.nexusTask.findFirst', () =>
      findNexusTaskRow({ organizationId: workspace.id, taskId })
    );
    if (!existingRow) throw new Error('Task not found');

    const existingTask = toTaskDto(existingRow);

    const updates = params.updates;
    const patch: Prisma.NexusTaskUpdateManyMutationInput = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.priority !== undefined) patch.priority = updates.priority == null ? null : String(updates.priority);
    if (updates.assigneeIds !== undefined) patch.assigneeIds = updates.assigneeIds;
    if (updates.assigneeId !== undefined) patch.assigneeId = updates.assigneeId ?? null;
    if (updates.creatorId !== undefined) patch.creatorId = updates.creatorId;
    if (updates.tags !== undefined) patch.tags = updates.tags;
    if (updates.dueDate !== undefined) patch.dueDate = parseDateOnlyToDate(updates.dueDate) ?? null;
    if (updates.dueTime !== undefined) patch.dueTime = parseTimeHHmmToDate(updates.dueTime) ?? null;
    if (updates.timeSpent !== undefined) patch.timeSpent = Number(updates.timeSpent ?? 0);
    if (updates.estimatedTime !== undefined) patch.estimatedTime = updates.estimatedTime ?? null;
    if (updates.approvalStatus !== undefined) patch.approvalStatus = updates.approvalStatus ?? null;
    if (updates.isTimerRunning !== undefined) patch.isTimerRunning = Boolean(updates.isTimerRunning);
    if (updates.messages !== undefined) patch.messages = normalizeMessagesForStorage(updates.messages);
    if (updates.clientId !== undefined) patch.clientId = updates.clientId ?? null;
    if (updates.isPrivate !== undefined) patch.isPrivate = Boolean(updates.isPrivate);
    if (updates.audioUrl !== undefined) patch.audioUrl = updates.audioUrl ?? null;
    if (updates.snoozeCount !== undefined) patch.snoozeCount = updates.snoozeCount ?? 0;
    if (updates.isFocus !== undefined) patch.isFocus = Boolean(updates.isFocus);
    if (updates.completionDetails !== undefined) {
      patch.completionDetails =
        updates.completionDetails == null ? Prisma.DbNull : safeToInputJsonValue(updates.completionDetails);
    }
    if (updates.department !== undefined) patch.department = updates.department ?? null;

    const updatedCount = await metrics.step('db.nexusTask.updateMany', () =>
      updateNexusTaskRowsById({
        organizationId: workspace.id,
        taskId,
        data: patch,
      })
    );
    if (!updatedCount.count) throw new Error('Failed to update task');

    const updatedRow = await metrics.step('db.nexusTask.findFirst.updated', () =>
      findNexusTaskRow({ organizationId: workspace.id, taskId })
    );
    if (!updatedRow) throw new Error('Failed to update task');

    const updated = await metrics.step('storage.resolveTaskAttachments', () =>
      resolveTaskAttachmentsForResponse(toTaskDto(updatedRow), {
        organizationId: workspace.id,
        orgSlug: workspace.slug,
      })
    );

    await logAuditEvent('data.write', 'task', {
      resourceId: taskId,
      details: { updatedBy: user.id, updates: params.updates },
    });

    try {
      if (updates.assigneeIds && Array.isArray(updates.assigneeIds)) {
        const oldAssignees = existingTask.assigneeIds || [];
        const newAssignees = updates.assigneeIds.filter((id: string) => !oldAssignees.includes(id));

        await metrics.step('notifications.insert_assigned_update', async () => {
          await insertMisradNotificationsForOrganizationId({
            organizationId: workspace.id,
            recipientIds: newAssignees,
            type: 'TASK',
            text: `שויכת למשימה: ${updated.title}`,
            reason: 'nexus_task_notification_assigned_update',
          });
        });
      }

      if (updates.status && updates.status !== existingTask.status) {
        const importantStatuses = ['Done', 'Waiting for Review'];
        if (
          importantStatuses.includes(updates.status) &&
          existingTask.creatorId &&
          existingTask.creatorId !== user.id
        ) {
          await metrics.step('notifications.insert_status_change', async () => {
            await insertMisradNotificationsForOrganizationId({
              organizationId: workspace.id,
              recipientIds: [String(existingTask.creatorId)],
              type: 'TASK',
              text: `סטטוס משימה השתנה ל-${updates.status}: ${updated.title}`,
              reason: 'nexus_task_notification_status',
            });
          });
        }
      }
    } catch {
      // ignore
    }

    return updated;
  } catch (e: unknown) {
    extra.error = getErrorMessage(e) || null;
    throw e;
  } finally {
    metrics.flush(extra);
  }
}

export async function deleteNexusTask(params: { orgId: string; taskId: string }): Promise<{ ok: true }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(params.orgId);
  const workspace = resolved.workspace;
  const user = resolved.clerkUser;

  await requirePermission('view_crm');

  const taskId = String(params.taskId || '').trim();
  if (!taskId) throw new Error('Task ID is required');

  const isSuperAdmin = user?.isSuperAdmin === true;
  const canAccess = isSuperAdmin
    ? true
    : await canAccessResource('task', taskId, 'write', { organizationId: workspace.id });
  if (!canAccess) throw new Error('Forbidden');

  const res = await deleteNexusTaskRowsById({ organizationId: workspace.id, taskId });
  if (!res.count) throw new Error('Failed to delete task');

  logAuditEvent('data.delete', 'task', { resourceId: taskId, details: { organizationId: workspace.id }, success: true }).catch(
    () => null
  );

  return { ok: true };
}
