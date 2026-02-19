'use server';

import { currentUser } from '@clerk/nextjs/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { asObject } from '@/lib/shared/unknown';
import { invalidateEmailAssetsCache } from '@/lib/email-assets';

async function requireSuperAdminOrFail(): Promise<
  | { success: false; error: string }
  | { success: true; userId: string }
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

export type EmailAssetsDTO = Record<string, string>;

/**
 * Get all email asset overrides from DB
 */
export async function adminGetEmailAssets(): Promise<{
  success: boolean;
  data?: EmailAssetsDTO;
  error?: string;
}> {
  try {
    const guard = await requireSuperAdminOrFail();
    if (!guard.success) return { success: false, error: guard.error };

    const { getEmailAssetsFromDB } = await import('@/lib/server/emailAssetsStore');
    const assets = await getEmailAssetsFromDB();

    return createSuccessResponse(assets);
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת הגדרות תמונות מיילים');
  }
}

/**
 * Save email asset overrides to DB (full replace)
 */
export async function adminUpdateEmailAssets(
  assets: EmailAssetsDTO
): Promise<{ success: boolean; data?: EmailAssetsDTO; error?: string }> {
  try {
    const guard = await requireSuperAdminOrFail();
    if (!guard.success) return { success: false, error: guard.error };

    const { setEmailAssetsInDB } = await import('@/lib/server/emailAssetsStore');

    const saved = await withTenantIsolationContext(
      {
        source: 'admin_update_email_assets',
        reason: 'set_email_assets',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => await setEmailAssetsInDB(assets)
    );

    invalidateEmailAssetsCache();

    return createSuccessResponse(saved);
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בשמירת הגדרות תמונות מיילים');
  }
}
