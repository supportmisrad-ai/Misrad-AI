'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { queryRawOrgScoped } from '@/lib/prisma';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import type { Prisma } from '@prisma/client';

export type SystemTaskDTO = {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string;
  due_date: string;
  priority: string;
  status: string;
  tags: string[];
  created_at: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

function getUnknownErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : null;
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((t) => String(t)).filter(Boolean);
  }
  const obj = asObject(value);
  const v = obj?.value;
  if (Array.isArray(v)) {
    return v.map((t) => String(t)).filter(Boolean);
  }
  return [];
}

function toSystemTaskDto(row: unknown): SystemTaskDTO {
  const obj = asObject(row) ?? {};
  const tags = normalizeTags(obj.tags);

  return {
    id: String(obj.id ?? ''),
    title: String(obj.title ?? ''),
    description: obj.description == null ? null : String(obj.description),
    assignee_id: String(obj.assigneeId ?? obj.assignee_id ?? ''),
    due_date: toIsoDate(obj.dueDate ?? obj.due_date) ?? new Date().toISOString(),
    priority: String(obj.priority ?? ''),
    status: String(obj.status ?? ''),
    tags,
    created_at: toIsoDate(obj.createdAt ?? obj.created_at) ?? new Date().toISOString(),
  };
}

async function requireSystemTaskInOrganization(params: {
  taskId: string;
  organizationId: string;
}): Promise<boolean> {
  const rows = await queryRawOrgScoped<unknown[]>(prisma, {
    organizationId: params.organizationId,
    reason: 'system_tasks_require_in_org',
    query: `
      SELECT t.id
      FROM system_tasks t
      JOIN profiles p ON p.id = t.assignee_id
      WHERE t.id = $1::uuid
        AND p.organization_id = $2::uuid
      LIMIT 1
    `,
    values: [params.taskId, params.organizationId],
  });

  return Array.isArray(rows) && rows.length > 0;
}

async function listSystemTasksInOrganization(params: {
  organizationId: string;
  take: number;
}): Promise<unknown[]> {
  const safeTake = Math.max(1, Math.min(500, Math.floor(params.take)));

  const rows = await queryRawOrgScoped<unknown[]>(prisma, {
    organizationId: params.organizationId,
    reason: 'system_tasks_list_in_org',
    query: `
      SELECT
        t.id,
        t.title,
        t.description,
        t.assignee_id,
        t.due_date,
        t.priority,
        t.status,
        t.tags,
        t.created_at,
        t.updated_at
      FROM system_tasks t
      JOIN profiles p ON p.id = t.assignee_id
      WHERE p.organization_id = $1::uuid
      ORDER BY t.due_date ASC, t.created_at DESC
      LIMIT $2::int
    `,
    values: [params.organizationId, safeTake],
  });

  return Array.isArray(rows) ? rows : [];
}

export async function getSystemTasks(params: { orgSlug: string; take?: number }): Promise<SystemTaskDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  requireOrganizationId('getSystemTasks', workspace?.id);
  const rows = await listSystemTasksInOrganization({
    organizationId: workspace.id,
    take: Math.max(1, Math.min(500, Math.floor(params.take ?? 200))),
  });
  return rows.map(toSystemTaskDto);
}

export async function createSystemTask(params: {
  orgSlug: string;
  input: {
    title: string;
    description?: string | null;
    assigneeId: string;
    dueDate: string;
    priority: string;
    status: string;
    tags?: string[];
  };
}): Promise<{ ok: true; task: SystemTaskDTO } | { ok: false; message: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    if (!orgSlug) throw new Error('orgSlug is required');

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('createSystemTask', workspace?.id);

    const title = String(params.input?.title || '').trim();
    if (!title) return { ok: false, message: 'חובה להזין כותרת' };

    const due = new Date(String(params.input?.dueDate || ''));
    if (Number.isNaN(due.getTime())) return { ok: false, message: 'תאריך יעד לא תקין' };

    const assigneeId = String(params.input?.assigneeId || '').trim();
    if (!assigneeId) return { ok: false, message: 'חובה לבחור אחראי' };

    const assignee = await prisma.profile.findFirst({
      where: { id: assigneeId, organizationId: workspace.id },
      select: { id: true },
    });
    if (!assignee?.id) return { ok: false, message: 'אחראי לא תקין' };

    const tags = Array.isArray(params.input?.tags) ? params.input.tags.map((t) => String(t)).filter(Boolean) : [];

    const created = await prisma.systemTask.create({
      data: {
        title,
        description: params.input.description == null ? null : String(params.input.description),
        assigneeId,
        dueDate: due,
        priority: String(params.input?.priority || 'medium'),
        status: String(params.input?.status || 'todo'),
        tags,
      },
    });

    return { ok: true, task: toSystemTaskDto(created) };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה ביצירת משימה' };
  }
}

export async function updateSystemTask(params: {
  orgSlug: string;
  taskId: string;
  patch: {
    title?: string;
    description?: string | null;
    assigneeId?: string;
    dueDate?: string;
    priority?: string;
    status?: string;
    tags?: string[];
  };
}): Promise<{ ok: true; task: SystemTaskDTO } | { ok: false; message: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    const taskId = String(params.taskId || '').trim();
    if (!orgSlug) throw new Error('orgSlug is required');
    if (!taskId) throw new Error('taskId is required');

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('updateSystemTask', workspace?.id);

    const existsInOrg = await requireSystemTaskInOrganization({ taskId, organizationId: workspace.id });
    if (!existsInOrg) return { ok: false, message: 'משימה לא נמצאה' };

    const data: Prisma.SystemTaskUpdateManyMutationInput = {};

    if (params.patch.title !== undefined) {
      const t = String(params.patch.title || '').trim();
      if (!t) return { ok: false, message: 'חובה להזין כותרת' };
      data.title = t;
    }

    if (params.patch.description !== undefined) {
      data.description = params.patch.description == null ? null : String(params.patch.description);
    }

    if (params.patch.assigneeId !== undefined) {
      const assigneeId = String(params.patch.assigneeId || '').trim();
      if (!assigneeId) return { ok: false, message: 'חובה לבחור אחראי' };

      const assignee = await prisma.profile.findFirst({
        where: { id: assigneeId, organizationId: workspace.id },
        select: { id: true },
      });
      if (!assignee?.id) return { ok: false, message: 'אחראי לא תקין' };
      data.assigneeId = assigneeId;
    }

    if (params.patch.dueDate !== undefined) {
      const d = new Date(String(params.patch.dueDate || ''));
      if (Number.isNaN(d.getTime())) return { ok: false, message: 'תאריך יעד לא תקין' };
      data.dueDate = d;
    }

    if (params.patch.priority !== undefined) {
      data.priority = String(params.patch.priority || '');
    }

    if (params.patch.status !== undefined) {
      data.status = String(params.patch.status || '');
    }

    if (params.patch.tags !== undefined) {
      data.tags = Array.isArray(params.patch.tags) ? params.patch.tags.map((t) => String(t)).filter(Boolean) : [];
    }

    const updated = await prisma.systemTask.updateMany({
      where: { id: taskId },
      data,
    });

    if (!updated.count) {
      return { ok: false, message: 'משימה לא נמצאה' };
    }

    const row = await prisma.systemTask.findFirst({
      where: { id: taskId },
    });
    if (!row) {
      return { ok: false, message: 'משימה לא נמצאה' };
    }

    return { ok: true, task: toSystemTaskDto(row) };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה בעדכון משימה' };
  }
}

export async function deleteSystemTask(params: {
  orgSlug: string;
  taskId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const orgSlug = String(params.orgSlug || '').trim();
    const taskId = String(params.taskId || '').trim();
    if (!orgSlug) throw new Error('orgSlug is required');
    if (!taskId) throw new Error('taskId is required');

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('deleteSystemTask', workspace?.id);

    const existsInOrg = await requireSystemTaskInOrganization({ taskId, organizationId: workspace.id });
    if (!existsInOrg) return { ok: false, message: 'משימה לא נמצאה' };

    const deleted = await prisma.systemTask.deleteMany({
      where: { id: taskId },
    });
    if (!deleted.count) return { ok: false, message: 'משימה לא נמצאה' };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה במחיקת משימה' };
  }
}
