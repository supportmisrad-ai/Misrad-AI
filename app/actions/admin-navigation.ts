'use server';

import prisma from '@/lib/prisma';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import { Prisma } from '@prisma/client';

import { asObject } from '@/lib/shared/unknown';
function isNavSection(value: unknown): value is NavigationItem['section'] {
  return value === 'global' || value === 'client' || value === 'management' || value === 'settings' || value === 'admin';
}

function normalizeRequiresRole(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    if (typeof parsed === 'string') return [parsed];
    return undefined;
  } catch {
    return undefined;
  }
}

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

    const items: NavigationItem[] = (data || []).map((item) => {
      const requiresRole = normalizeRequiresRole(item.requires_role);
      
      return {
        id: String(item.id),
        label: String(item.label),
        icon: String(item.icon),
        view: String(item.view),
        section: isNavSection(item.section) ? item.section : 'global',
        order: Number(item.order) || 0,
        isVisible: item.is_visible !== false,
        requiresClient: Boolean(item.requires_client),
        requiresRole: requiresRole ?? undefined,
      };
    });

    // Do not expose role-restricted items in the public menu endpoint.
    const publicItems = items.filter((i) => !Array.isArray(i.requiresRole) || i.requiresRole.length === 0);
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
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
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
            requires_role: (item.requiresRole ? item.requiresRole : Prisma.DbNull) as Prisma.InputJsonValue,
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
            requires_role: (item.requiresRole ? item.requiresRole : Prisma.DbNull) as Prisma.InputJsonValue,
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
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    const data = await prisma.social_navigation_menu.findMany({
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    });

    const items: NavigationItem[] = (data || []).map((item) => {
      const requiresRole = normalizeRequiresRole(item.requires_role);
      return {
        id: String(item.id),
        label: String(item.label),
        icon: String(item.icon),
        view: String(item.view),
        section: isNavSection(item.section) ? item.section : 'global',
        order: Number(item.order) || 0,
        isVisible: item.is_visible !== false,
        requiresClient: Boolean(item.requires_client),
        requiresRole: requiresRole ?? undefined,
      };
    });

    return createSuccessResponse(items);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת תפריט');
  }
}

