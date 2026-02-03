'use server';

import prisma from '@/lib/prisma';
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
    const data = await prisma.social_navigation_menu.findMany({
      where: { is_visible: true },
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    });

    const items: NavigationItem[] = (data || []).map((item: any) => {
      let requiresRole = null;
      try {
        if (item.requires_role) {
          requiresRole = Array.isArray(item.requires_role)
            ? item.requires_role
            : typeof item.requires_role === 'string'
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

    if (items.length > 0) {
      for (const item of items) {
        await prisma.social_navigation_menu.upsert({
          where: { id: String(item.id) },
          create: {
            id: String(item.id),
            label: String(item.label),
            icon: String(item.icon),
            view: String(item.view),
            section: String(item.section),
            order: Number(item.order) || 0,
            is_visible: item.isVisible !== false,
            requires_client: Boolean(item.requiresClient),
            requires_role: (item.requiresRole ? item.requiresRole : null) as any,
            updated_at: new Date(),
          },
          update: {
            label: String(item.label),
            icon: String(item.icon),
            view: String(item.view),
            section: String(item.section),
            order: Number(item.order) || 0,
            is_visible: item.isVisible !== false,
            requires_client: Boolean(item.requiresClient),
            requires_role: (item.requiresRole ? item.requiresRole : null) as any,
            updated_at: new Date(),
          },
        });
      }
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

    const data = await prisma.social_navigation_menu.findMany({
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    });

    const items: NavigationItem[] = (data || []).map((item: any) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      view: item.view,
      section: item.section,
      order: item.order,
      isVisible: item.is_visible,
      requiresClient: item.requires_client,
      requiresRole: Array.isArray(item.requires_role)
        ? item.requires_role
        : item.requires_role
          ? [String(item.requires_role)]
          : null,
    }));

    return createSuccessResponse(items);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת תפריט');
  }
}

