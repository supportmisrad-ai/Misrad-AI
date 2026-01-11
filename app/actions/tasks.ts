'use server';

import { createClient } from '@/lib/supabase';
import { SocialTask } from '@/types';

/**
 * Server Action: Get all tasks
 */
export async function getTasks(clientId?: string): Promise<{ success: boolean; data?: SocialTask[]; error?: string }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('social_tasks')
      .select('*')
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
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('social_tasks')
      .insert({
        client_id: taskData.clientId,
        assigned_to: taskData.assignedTo,
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.dueDate,
        priority: taskData.priority,
        status: taskData.status || 'todo',
        type: taskData.type,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const task: SocialTask = {
      id: data.id,
      clientId: data.client_id,
      assignedTo: data.assigned_to,
      title: data.title,
      description: data.description,
      dueDate: data.due_date,
      priority: data.priority,
      status: data.status,
      type: data.type,
    };

    return {
      success: true,
      data: task,
    };
  } catch (error: any) {
    console.error('Error in createTask:', error);
    return {
      success: false,
      error: error.message || 'שגיאה ביצירת משימה',
    };
  }
}

/**
 * Server Action: Update a task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<SocialTask>
): Promise<{ success: boolean; data?: SocialTask; error?: string }> {
  try {
    const supabase = createClient();

    const updateData: any = {};
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.type !== undefined) updateData.type = updates.type;

    const { data, error } = await supabase
      .from('social_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const task: SocialTask = {
      id: data.id,
      clientId: data.client_id,
      assignedTo: data.assigned_to,
      title: data.title,
      description: data.description,
      dueDate: data.due_date,
      priority: data.priority,
      status: data.status,
      type: data.type,
    };

    return {
      success: true,
      data: task,
    };
  } catch (error: any) {
    console.error('Error in updateTask:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בעדכון משימה',
    };
  }
}

/**
 * Server Action: Delete a task
 */
export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('social_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error in deleteTask:', error);
    return {
      success: false,
      error: error.message || 'שגיאה במחיקת משימה',
    };
  }
}

