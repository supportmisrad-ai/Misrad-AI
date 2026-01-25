'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

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

function toSystemTaskDto(row: any): SystemTaskDTO {
  const tags = Array.isArray(row.tags) ? row.tags : Array.isArray(row.tags?.value) ? row.tags.value : row.tags;
  const normalizedTags = Array.isArray(tags) ? tags.map((t: any) => String(t)).filter(Boolean) : [];

  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: row.description == null ? null : String(row.description),
    assignee_id: String(row.assigneeId || row.assignee_id || ''),
    due_date: new Date(row.dueDate || row.due_date || new Date()).toISOString(),
    priority: String(row.priority || ''),
    status: String(row.status || ''),
    tags: normalizedTags,
    created_at: new Date(row.createdAt || row.created_at || new Date()).toISOString(),
  };
}

async function requireSystemTaskInOrganization(params: {
  taskId: string;
  organizationId: string;
}): Promise<boolean> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT t.id
    FROM system_tasks t
    JOIN profiles p ON p.id = t.assignee_id
    WHERE t.id = ${params.taskId}::uuid
      AND p.organization_id = ${params.organizationId}::uuid
    LIMIT 1
  `;

  return Array.isArray(rows) && rows.length > 0;
}

async function listSystemTasksInOrganization(params: {
  organizationId: string;
  take: number;
}): Promise<any[]> {
  const safeTake = Math.max(1, Math.min(500, Math.floor(params.take)));

  const rows = await prisma.$queryRaw<any[]>`
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
    WHERE p.organization_id = ${params.organizationId}::uuid
    ORDER BY t.due_date ASC, t.created_at DESC
    LIMIT ${safeTake}
  `;

  return Array.isArray(rows) ? rows : [];
}

async function listOrgProfileIds(orgSlug: string): Promise<string[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const assignees = await prisma.profile.findMany({
    where: { organizationId: workspace.id },
    select: { id: true },
    take: 500,
  });
  return assignees.map((a) => String(a.id)).filter(Boolean);
}

export async function getSystemTasks(params: { orgSlug: string; take?: number }): Promise<SystemTaskDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
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
      } as any,
    });

    return { ok: true, task: toSystemTaskDto(created) };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה ביצירת משימה' };
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

    const existsInOrg = await requireSystemTaskInOrganization({ taskId, organizationId: workspace.id });
    if (!existsInOrg) return { ok: false, message: 'משימה לא נמצאה' };

    const data: any = {};

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

    const updated = await prisma.systemTask.update({
      where: { id: taskId },
      data: { ...data } as any,
    });

    return { ok: true, task: toSystemTaskDto(updated) };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה בעדכון משימה' };
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

    const existsInOrg = await requireSystemTaskInOrganization({ taskId, organizationId: workspace.id });
    if (!existsInOrg) return { ok: false, message: 'משימה לא נמצאה' };

    await prisma.systemTask.delete({ where: { id: taskId } });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה במחיקת משימה' };
  }
}
