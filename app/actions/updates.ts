'use server';

import { auth } from '@clerk/nextjs/server';
import { translateError } from '@/lib/errorTranslations';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

function isMissingTableError(error: unknown, tableName: string) {
  const obj = asObject(error);
  const msg = String(obj?.message || '');
  return msg.includes(`Could not find the table 'public.${tableName}' in the schema cache`);
}

async function getOrCreateSocialUserIdForClerkUserId(clerkUserId: string): Promise<string | null> {
  const id = String(clerkUserId || '').trim();
  if (!id) return null;

  try {
    const existing = await prisma.social_users.findUnique({
      where: { clerk_user_id: id },
      select: { id: true },
    });
    if (existing?.id) return String(existing.id);
  } catch {
    // ignore
  }

  const now = new Date();
  try {
    const created = await prisma.social_users.create({
      data: {
        clerk_user_id: id,
        role: 'team_member',
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    return created?.id ? String(created.id) : null;
  } catch (error: unknown) {
    const errorObj = asObject(error);
    const code = getStringProp(errorObj, 'code');
    if (code === 'P2002') {
      try {
        const existingAfter = await prisma.social_users.findUnique({
          where: { clerk_user_id: id },
          select: { id: true },
        });
        if (existingAfter?.id) return String(existingAfter.id);
      } catch {
        // ignore
      }
    }
    throw error;
  }
}

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
    const updates = await prisma.social_app_updates.findMany({
      where: { is_published: true },
      orderBy: { published_at: 'desc' },
      select: { id: true, version: true, title: true, description: true, category: true, priority: true, published_at: true },
    });

    const formattedUpdates: AppUpdate[] = ((updates || []) as unknown[]).map((update) => {
      const obj = asObject(update) ?? {};
      const publishedAtRaw = obj.published_at;
      return {
        id: String(obj.id ?? ''),
        version: String(obj.version ?? ''),
        title: String(obj.title ?? ''),
        description: String(obj.description ?? ''),
        category: String(obj.category ?? '') as AppUpdate['category'],
        priority: String(obj.priority ?? '') as AppUpdate['priority'],
        publishedAt: publishedAtRaw ? new Date(String(publishedAtRaw)).toISOString() : '',
      };
    });

    return { success: true, data: formattedUpdates };
  } catch (error: unknown) {
    console.error('Error getting updates:', error);
    if (isMissingTableError(error, 'app_updates')) {
      return { success: true, data: [] };
    }
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בטעינת עדכונים') };
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

    const socialUserId = await getOrCreateSocialUserIdForClerkUserId(userId);
    if (!socialUserId) {
      return { success: false, error: 'שגיאה בקבלת משתמש' };
    }

    const updates = await prisma.social_app_updates.findMany({
      where: { is_published: true },
      orderBy: { published_at: 'desc' },
      select: { id: true, version: true, title: true, description: true, category: true, priority: true, published_at: true },
    });

    const viewedUpdates = await prisma.social_user_update_views.findMany({
      where: { user_id: socialUserId },
      select: { update_id: true },
    });

    const viewedIds = new Set(
      ((viewedUpdates || []) as unknown[])
        .map((v) => {
          const obj = asObject(v);
          return obj?.update_id == null ? '' : String(obj.update_id);
        })
        .filter(Boolean)
    );

    const formattedUpdates: AppUpdate[] = ((updates || []) as unknown[]).map((update) => {
      const obj = asObject(update) ?? {};
      const id = String(obj.id ?? '');
      const publishedAtRaw = obj.published_at;
      return {
        id,
        version: String(obj.version ?? ''),
        title: String(obj.title ?? ''),
        description: String(obj.description ?? ''),
        category: String(obj.category ?? '') as AppUpdate['category'],
        priority: String(obj.priority ?? '') as AppUpdate['priority'],
        publishedAt: publishedAtRaw ? new Date(String(publishedAtRaw)).toISOString() : '',
        isViewed: viewedIds.has(id),
      };
    });

    return { success: true, data: formattedUpdates };
  } catch (error: unknown) {
    console.error('Error getting updates with status:', error);
    if (isMissingTableError(error, 'app_updates')) {
      return { success: true, data: [] };
    }
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בטעינת עדכונים') };
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

    const socialUserId = await getOrCreateSocialUserIdForClerkUserId(userId);
    if (!socialUserId) {
      return { success: false, error: 'שגיאה בקבלת משתמש' };
    }

    const now = new Date();
    const where = {
      user_id_update_id: {
        user_id: socialUserId,
        update_id: String(updateId),
      },
    } satisfies Prisma.social_user_update_viewsWhereUniqueInput;

    await prisma.social_user_update_views.upsert({
      where,
      create: {
        user_id: socialUserId,
        update_id: String(updateId),
        viewed_at: now,
      },
      update: {
        viewed_at: now,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Error marking update as viewed:', error);
    if (isMissingTableError(error, 'user_update_views')) {
      return { success: true };
    }
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בסימון עדכון') };
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

    const socialUserId = await getOrCreateSocialUserIdForClerkUserId(userId);
    if (!socialUserId) {
      return { success: true, count: 0 };
    }

    const updates = await prisma.social_app_updates.findMany({
      where: { is_published: true },
      select: { id: true },
    });

    const viewedUpdates = await prisma.social_user_update_views.findMany({
      where: { user_id: socialUserId },
      select: { update_id: true },
    });

    const viewedIds = new Set(
      ((viewedUpdates || []) as unknown[])
        .map((v) => {
          const obj = asObject(v);
          return obj?.update_id == null ? '' : String(obj.update_id);
        })
        .filter(Boolean)
    );

    const unreadCount = ((updates || []) as unknown[]).filter((u) => {
      const obj = asObject(u);
      const id = obj?.id == null ? '' : String(obj.id);
      return id && !viewedIds.has(id);
    }).length;

    return { success: true, count: unreadCount };
  } catch (error: unknown) {
    console.error('Error getting unread count:', error);
    if (isMissingTableError(error, 'app_updates') || isMissingTableError(error, 'user_update_views')) {
      return { success: true, count: 0 };
    }
    return { success: true, count: 0 }; // Return 0 on error to not block UI
  }
}

