'use server';

import { auth } from '@clerk/nextjs/server';
import { translateError } from '@/lib/errorTranslations';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

function getStringProp(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function isMissingTableError(error: unknown, tableName: string) {
  const obj = asObject(error);
  const msg = String(obj?.message || '');
  const code = String(obj?.code || '').toLowerCase();
  return (
    code === 'p2021' ||
    code === '42p01' ||
    msg.includes(`Could not find the table 'public.${tableName}' in the schema cache`)
  );
}

function isSchemaMismatchError(error: unknown): boolean {
  const obj = asObject(error) ?? {};
  const code = String(obj.code ?? '').toLowerCase();
  const msg = String(obj.message ?? '').toLowerCase();
  return (
    code === 'p2021' ||
    code === 'p2022' ||
    code === '42p01' ||
    code === '42703' ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('column')
  );
}

async function getOrCreateOrganizationUserIdForClerkUserId(clerkUserId: string): Promise<string | null> {
  const id = String(clerkUserId || '').trim();
  if (!id) return null;

  try {
    const existing = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: id },
      select: { id: true },
    });
    if (existing?.id) return String(existing.id);
  } catch {
    // ignore
  }

  const now = new Date();
  try {
    const created = await prisma.organizationUser.create({
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
        const existingAfter = await prisma.organizationUser.findUnique({
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

async function getOrCreateSocialUserIdForClerkUserId(clerkUserId: string): Promise<string | null> {
  return await getOrCreateOrganizationUserIdForClerkUserId(clerkUserId);
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
    const updates = await prisma.appUpdate.findMany({
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
    if (isMissingTableError(error, 'app_updates') || isSchemaMismatchError(error)) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] app_updates missing table/column (${getErrorMessage(error) || 'missing relation'})`);
      }
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

    const updates = await prisma.appUpdate.findMany({
      where: { is_published: true },
      orderBy: { published_at: 'desc' },
      select: { id: true, version: true, title: true, description: true, category: true, priority: true, published_at: true },
    });

    const viewedUpdates = await prisma.userUpdateView.findMany({
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
    if (isMissingTableError(error, 'app_updates') || isSchemaMismatchError(error)) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] app_updates/user_update_views missing table/column (${getErrorMessage(error) || 'missing relation'})`);
      }
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
    } satisfies Prisma.UserUpdateViewWhereUniqueInput;
    // @ts-expect-error - Prisma type name variance

    await prisma.userUpdateView.upsert({
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
    if (isMissingTableError(error, 'user_update_views') || isSchemaMismatchError(error)) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] user_update_views missing table/column (${getErrorMessage(error) || 'missing relation'})`);
      }
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

    const updates = await prisma.appUpdate.findMany({
      where: { is_published: true },
      select: { id: true },
    });

    const viewedUpdates = await prisma.userUpdateView.findMany({
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
    if (
      isMissingTableError(error, 'app_updates') ||
      isMissingTableError(error, 'user_update_views') ||
      isSchemaMismatchError(error)
    ) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] app_updates/user_update_views missing table/column (${getErrorMessage(error) || 'missing relation'})`);
      }
      return { success: true, count: 0 };
    }
    return { success: true, count: 0 }; // Return 0 on error to not block UI
  }
}

