'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

/**
 * Send notification to users/clients
 */
export async function sendNotification(
  targetType: 'user' | 'client' | 'all',
  targetId: string | null,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info'
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Create notification record
    const { error } = await supabase
      .from('notifications')
      .insert({
        target_type: targetType,
        target_id: targetId,
        title,
        message,
        type,
        created_at: new Date().toISOString(),
        is_read: false,
      });

    if (error) {
      // If notifications table doesn't exist, log to activity_logs
      await supabase.from('activity_logs').insert({
        user_id: authCheck.userId,
        action: `שליחת התראה: ${title} - ${message}`,
        created_at: new Date().toISOString(),
      });
    }

    // Log the action
    await supabase.from('activity_logs').insert({
      user_id: authCheck.userId,
      action: `שליחת התראה: ${title} ל-${targetType === 'all' ? 'כל המשתמשים' : targetId}`,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשליחת התראה');
  }
}

/**
 * Get notification history
 */
export async function getNotificationHistory(params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const limit = Math.max(1, Math.min(200, Number(params?.limit ?? 50)));
    const offset = Math.max(0, Number(params?.offset ?? 0));

    // Try to get from notifications table
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (notifications) {
      return createSuccessResponse(notifications);
    }

    // Fallback: get from activity_logs
    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .or('action.ilike.%התראה%,action.ilike.%notification%')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return createSuccessResponse(activityLogs || []);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת היסטוריית התראות');
  }
}

