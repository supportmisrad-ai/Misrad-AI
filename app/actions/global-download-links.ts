'use server';

import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { asObject } from '@/lib/shared/unknown';
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
  adminAndroidDownloadUrl: string | null;
};

const updateSchema = z.object({
  windowsDownloadUrl: z.string().trim().min(1).nullable().optional(),
  androidDownloadUrl: z.string().trim().min(1).nullable().optional(),
  adminAndroidDownloadUrl: z.string().trim().min(1).nullable().optional(),
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
      adminAndroidDownloadUrl: links.adminAndroidDownloadUrl,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת לינקים להורדה');
  }
}

export async function adminUpdateGlobalDownloadLinks(input: {
  windowsDownloadUrl?: string | null;
  androidDownloadUrl?: string | null;
  adminAndroidDownloadUrl?: string | null;
}): Promise<{ success: boolean; data?: GlobalDownloadLinksDTO; error?: string }> {
  try {
    const guard = await requireSuperAdminOrFail();
    if (!guard.success) return { success: false, error: guard.error };

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return createErrorResponse(parsed.error, 'קלט לא תקין');
    }

    const { setGlobalDownloadLinksUnsafe } = await import('@/lib/server/globalDownloadLinks');
    const next = await withTenantIsolationContext(
      {
        source: 'admin_update_global_download_links',
        reason: 'set_global_download_links',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await setGlobalDownloadLinksUnsafe({
          windowsDownloadUrl: parsed.data.windowsDownloadUrl,
          androidDownloadUrl: parsed.data.androidDownloadUrl,
          adminAndroidDownloadUrl: parsed.data.adminAndroidDownloadUrl,
        })
    );

    return createSuccessResponse({
      windowsDownloadUrl: next.windowsDownloadUrl,
      androidDownloadUrl: next.androidDownloadUrl,
      adminAndroidDownloadUrl: next.adminAndroidDownloadUrl,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בשמירת לינקים להורדה');
  }
}
