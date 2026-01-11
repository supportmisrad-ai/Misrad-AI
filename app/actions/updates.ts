'use server';

import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { auth } from '@clerk/nextjs/server';
import { translateError } from '@/lib/errorTranslations';

export interface AppUpdate {
  id: string;
  version: string;
  title: string;
  description: string;
  category: 'security' | 'feature' | 'improvement' | 'bugfix' | 'breaking';
  priority: 'low' | 'medium' | 'high' | 'critical';
  publishedAt: string;
  isViewed?: boolean;
}

/**
 * Get all published updates
 */
export async function getUpdates(): Promise<{ success: boolean; data?: AppUpdate[]; error?: string }> {
  try {
    const supabase = createClient();

    const { data: updates, error } = await supabase
      .from('app_updates')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) throw error;

    const formattedUpdates: AppUpdate[] = (updates || []).map(update => ({
      id: update.id,
      version: update.version,
      title: update.title,
      description: update.description,
      category: update.category,
      priority: update.priority,
      publishedAt: update.published_at,
    }));

    return { success: true, data: formattedUpdates };
  } catch (error: any) {
    console.error('Error getting updates:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בטעינת עדכונים') };
  }
}

/**
 * Get updates with viewed status for current user
 */
export async function getUpdatesWithStatus(): Promise<{ success: boolean; data?: AppUpdate[]; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה בקבלת משתמש' };
    }
    const supabaseUserId = userResult.userId;

    const supabase = createClient();

    // Get all published updates
    const { data: updates, error: updatesError } = await supabase
      .from('app_updates')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (updatesError) throw updatesError;

    // Get viewed updates for this user
    const { data: viewedUpdates, error: viewedError } = await supabase
      .from('user_update_views')
      .select('update_id')
      .eq('user_id', supabaseUserId);

    if (viewedError) throw viewedError;

    const viewedIds = new Set((viewedUpdates || []).map(v => v.update_id));

    const formattedUpdates: AppUpdate[] = (updates || []).map(update => ({
      id: update.id,
      version: update.version,
      title: update.title,
      description: update.description,
      category: update.category,
      priority: update.priority,
      publishedAt: update.published_at,
      isViewed: viewedIds.has(update.id),
    }));

    return { success: true, data: formattedUpdates };
  } catch (error: any) {
    console.error('Error getting updates with status:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בטעינת עדכונים') };
  }
}

/**
 * Mark update as viewed
 */
export async function markUpdateAsViewed(updateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה בקבלת משתמש' };
    }
    const supabaseUserId = userResult.userId;

    const supabase = createClient();

    const { error } = await supabase
      .from('user_update_views')
      .upsert({
        user_id: supabaseUserId,
        update_id: updateId,
      }, {
        onConflict: 'user_id,update_id',
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error marking update as viewed:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בסימון עדכון') };
  }
}

/**
 * Get unread updates count
 */
export async function getUnreadUpdatesCount(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: true, count: 0 };
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: true, count: 0 };
    }
    const supabaseUserId = userResult.userId;

    const supabase = createClient();

    // Get all published updates
    const { data: updates, error: updatesError } = await supabase
      .from('app_updates')
      .select('id')
      .eq('is_published', true);

    if (updatesError) throw updatesError;

    // Get viewed updates
    const { data: viewedUpdates, error: viewedError } = await supabase
      .from('user_update_views')
      .select('update_id')
      .eq('user_id', supabaseUserId);

    if (viewedError) throw viewedError;

    const viewedIds = new Set((viewedUpdates || []).map(v => v.update_id));
    const unreadCount = (updates || []).filter(u => !viewedIds.has(u.id)).length;

    return { success: true, count: unreadCount };
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    return { success: true, count: 0 }; // Return 0 on error to not block UI
  }
}

