'use server';

import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string; // Icon name from lucide-react
  view: string; // View type
  section: 'global' | 'client' | 'management' | 'settings' | 'admin';
  order: number;
  isVisible: boolean;
  requiresClient?: boolean; // Only show when client is selected
  requiresRole?: string[]; // Only show for specific roles
}

/**
 * Get navigation menu structure (public - no auth required)
 */
export async function getNavigationMenu(): Promise<{
  success: boolean;
  data?: NavigationItem[];
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('navigation_menu')
      .select('*')
      .eq('is_visible', true)
      .order('section', { ascending: true })
      .order('order', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return createSuccessResponse([]);
      }
      return createErrorResponse(error, 'שגיאה בטעינת תפריט');
    }

    const items: NavigationItem[] = (data || []).map((item: any) => {
      let requiresRole = null;
      try {
        if (item.requires_role) {
          requiresRole = typeof item.requires_role === 'string' 
            ? JSON.parse(item.requires_role) 
            : item.requires_role;
        }
      } catch {
        requiresRole = null;
      }
      
      return {
        id: item.id,
        label: item.label,
        icon: item.icon,
        view: item.view,
        section: item.section,
        order: item.order || 0,
        isVisible: item.is_visible !== false,
        requiresClient: item.requires_client || false,
        requiresRole,
      };
    });

    // Do not expose role-restricted items in the public menu endpoint.
    const publicItems = items.filter((i: any) => !Array.isArray(i.requiresRole) || i.requiresRole.length === 0);
    return createSuccessResponse(publicItems);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת תפריט');
  }
}

/**
 * Update navigation menu (admin only)
 */
export async function updateNavigationMenu(
  items: NavigationItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    // Upsert items (update existing, insert new)
    if (items.length > 0) {
      const { error } = await supabase
        .from('navigation_menu')
        .upsert(
          items.map(item => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            view: item.view,
            section: item.section,
            order: item.order,
            is_visible: item.isVisible,
            requires_client: item.requiresClient || false,
            requires_role: item.requiresRole ? JSON.stringify(item.requiresRole) : null,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        );

      if (error) {
        return createErrorResponse(error, 'שגיאה בשמירת תפריט');
      }
    }

    // Log the action
    try {
      await supabase.from('activity_logs').insert({
        user_id: authCheck.userId,
        action: 'עדכון תפריט ניווט',
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      // Logging is optional
      console.warn('[updateNavigationMenu] Failed to log action:', logError);
    }

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשמירת תפריט');
  }
}

/**
 * Get all navigation items (for admin editing)
 */
export async function getAllNavigationItems(): Promise<{
  success: boolean;
  data?: NavigationItem[];
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }

    await requireSuperAdmin();

    const supabase = createClient();

    const { data, error } = await supabase
      .from('navigation_menu')
      .select('*')
      .order('section', { ascending: true })
      .order('order', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return createSuccessResponse([]);
      }
      return createErrorResponse(error, 'שגיאה בטעינת תפריט');
    }

    const items: NavigationItem[] = (data || []).map((item: any) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      view: item.view,
      section: item.section,
      order: item.order,
      isVisible: item.is_visible,
      requiresClient: item.requires_client,
      requiresRole: item.requires_role ? JSON.parse(item.requires_role) : null,
    }));

    return createSuccessResponse(items);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת תפריט');
  }
}

