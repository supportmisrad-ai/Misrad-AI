'use server';

import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function requireSuperAdminOrFail(): Promise<
  | { success: false; error: string }
  | {
      success: true;
      userId: string;
    }
> {
  const authCheck = await requireAuth();
  if (!authCheck.success) {
    return { success: false, error: authCheck.error || 'נדרשת התחברות' };
  }

  const u = await currentUser();
  const meta = asObject(u?.publicMetadata);
  const isSuperAdmin = Boolean(meta?.isSuperAdmin);
  if (!isSuperAdmin) {
    return { success: false, error: 'אין הרשאה' };
  }

  const userId = authCheck.userId ?? authCheck.data?.userId;
  return { success: true, userId: String(userId || '') };
}

export type GlobalDownloadLinksDTO = {
  windowsDownloadUrl: string | null;
  androidDownloadUrl: string | null;
};

const updateSchema = z.object({
  windowsDownloadUrl: z.string().trim().min(1).nullable().optional(),
  androidDownloadUrl: z.string().trim().min(1).nullable().optional(),
});

export async function adminGetGlobalDownloadLinks(): Promise<{
  success: boolean;
  data?: GlobalDownloadLinksDTO;
  error?: string;
}> {
  try {
    const guard = await requireSuperAdminOrFail();
    if (!guard.success) return { success: false, error: guard.error };

    const { getGlobalDownloadLinksUnsafe } = await import('@/lib/server/globalDownloadLinks');
    const links = await getGlobalDownloadLinksUnsafe();

    return createSuccessResponse({
      windowsDownloadUrl: links.windowsDownloadUrl,
      androidDownloadUrl: links.androidDownloadUrl,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת לינקים להורדה');
  }
}

export async function adminUpdateGlobalDownloadLinks(input: {
  windowsDownloadUrl?: string | null;
  androidDownloadUrl?: string | null;
}): Promise<{ success: boolean; data?: GlobalDownloadLinksDTO; error?: string }> {
  try {
    const guard = await requireSuperAdminOrFail();
    if (!guard.success) return { success: false, error: guard.error };

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return createErrorResponse(parsed.error, 'קלט לא תקין');
    }

    const { setGlobalDownloadLinksUnsafe } = await import('@/lib/server/globalDownloadLinks');
    const next = await setGlobalDownloadLinksUnsafe({
      windowsDownloadUrl: parsed.data.windowsDownloadUrl,
      androidDownloadUrl: parsed.data.androidDownloadUrl,
    });

    return createSuccessResponse({
      windowsDownloadUrl: next.windowsDownloadUrl,
      androidDownloadUrl: next.androidDownloadUrl,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בשמירת לינקים להורדה');
  }
}
