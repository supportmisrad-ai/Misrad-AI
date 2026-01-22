'use server';

import { createClient } from '@/lib/supabase';
import { SocialTask } from '@/types';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

/**
 * Server Action: Get all tasks
 */
export async function getTasks(orgSlug?: string, clientId?: string): Promise<{ success: boolean; data?: SocialTask[]; error?: string }> {
  try {
    const supabase = createClient();

    const resolvedOrgSlug = typeof orgSlug === 'string' ? orgSlug.trim() : '';
    if (!resolvedOrgSlug) {
      return { success: true, data: [] };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);

    let query = supabase
      .from('social_tasks')
      .select('*, clients!inner(organization_id)')
      .eq('clients.organization_id', workspace.id)
      .order('due_date', { ascending: true });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const tasks: SocialTask[] = (data || []).map((task: any) => ({
      id: task.id,
      clientId: task.client_id,
      assignedTo: task.assigned_to,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      priority: task.priority,
      status: task.status,
      type: task.type,
    }));

    return {
      success: true,
      data: tasks,
    };
  } catch (error: any) {
    console.error('Error in getTasks:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בטעינת משימות',
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

