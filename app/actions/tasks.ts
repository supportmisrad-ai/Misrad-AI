'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SocialTask } from '@/types/social';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { getErrorMessage } from '@/lib/shared/unknown';

type SocialTaskRow = Prisma.SocialMediaTaskGetPayload<{
  // @ts-expect-error - Using correct runtime model name
  select: {
    id: true;
    client_id: true;
    assigned_to: true;
    title: true;
    description: true;
    due_date: true;
    priority: true;
    status: true;
    type: true;
  };
}>;

/**
 * Server Action: Get all tasks
 */
export async function getTasks(orgSlug?: string, clientId?: string): Promise<{ success: boolean; data?: SocialTask[]; error?: string }> {
  try {
    const resolvedOrgSlug = typeof orgSlug === 'string' ? orgSlug.trim() : '';
    if (!resolvedOrgSlug) {
      return { success: true, data: [] };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    const organizationId = String(workspace.id || '').trim();
    if (!organizationId) {
      return { success: false, error: 'Missing organizationId' };
    }

    const rows: SocialTaskRow[] = await prisma.socialMediaTask.findMany({
      where: {
        organizationId,
        ...(clientId ? { client_id: clientId } : {}),
      },
      select: {
        id: true,
        client_id: true,
        assigned_to: true,
        title: true,
        description: true,
        due_date: true,
        priority: true,
        status: true,
        type: true,
      },
      orderBy: { due_date: 'asc' },
    });

    const tasks: SocialTask[] = rows.map((task) => ({
      id: String(task.id),
      clientId: task.client_id ?? undefined,
      assignedTo: task.assigned_to ?? undefined,
      title: String(task.title ?? ''),
      description: String(task.description ?? ''),
      dueDate: task.due_date == null ? '' : String(task.due_date),
      priority: (task.priority ?? 'medium') as SocialTask['priority'],
      status: (task.status ?? 'todo') as SocialTask['status'],
      type: (task.type ?? 'general') as SocialTask['type'],
    }));

    return {
      success: true,
      data: tasks,
    };
  } catch (error: unknown) {
    console.error('Error in getTasks:', error);
    return {
      success: false,
      error: getErrorMessage(error) || 'שגיאה בטעינת משימות',
    };
  }
}

/**
 * Server Action: Create a new task
 */
export async function createTask(
  taskData: Omit<SocialTask, 'id'>
): Promise<{ success: boolean; data?: SocialTask; error?: string }> {
  return { success: false, error: 'יצירת משימה חסומה זמנית (Tenant Isolation lockdown)' };
}

/**
 * Server Action: Update a task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<SocialTask>
): Promise<{ success: boolean; data?: SocialTask; error?: string }> {
  return { success: false, error: 'עדכון משימה חסום זמנית (Tenant Isolation lockdown)' };
}

/**
 * Server Action: Delete a task
 */
export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'מחיקת משימה חסומה זמנית (Tenant Isolation lockdown)' };
}

