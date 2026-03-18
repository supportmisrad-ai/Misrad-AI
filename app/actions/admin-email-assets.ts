'use server';

import { currentUser } from '@clerk/nextjs/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { asObject } from '@/lib/shared/unknown';
import { invalidateEmailAssetsCache } from '@/lib/email-assets';
import { createServiceRoleClient } from '@/lib/supabase';

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

/**
 * Upload an email asset file to Supabase Storage and update DB
 * With server-side size validation and hard limits
 */
export async function adminUploadEmailAsset(
  formData: FormData
): Promise<{ success: boolean; data?: { key: string; url: string }; error?: string }> {
  try {
    const guard = await requireSuperAdminOrFail();
    if (!guard.success) return { success: false, error: guard.error };

    const key = formData.get('key') as string;
    const file = formData.get('file') as File;

    if (!key || !file) {
      return { success: false, error: 'מפתח או קובץ חסרים' };
    }

    // Server-side validation: hard limit 2MB
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `הקובץ גדול מדי (${(file.size / 1024 / 1024).toFixed(2)}MB). מקסימום: 2MB. אנא דחס את התמונה.`
      };
    }

    // Validate file type server-side as well
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return { 
        success: false, 
        error: `פורמט לא נתמך: ${file.type}. ניתן להעלות: JPEG, PNG, WebP.`
      };
    }

    // Initialize Supabase Service Role client for storage access
    const supabase = createServiceRoleClient({ 
      reason: 'storage_upload_global_branding', 
      allowUnscoped: true 
    });

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    // Normalize extension for consistency
    const normalizedExt = fileExt === 'jpeg' ? 'jpg' : fileExt;
    const fileName = `${key}-${Date.now()}.${normalizedExt}`;
    const filePath = `email-assets/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, fileData, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      // Provide user-friendly error based on error type
      if (uploadError.message?.includes('413') || uploadError.message?.includes('too large')) {
        return { success: false, error: 'הקובץ גדול מדי לשרת. נסה תמונה קטנה יותר.' };
      }
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    // Update DB
    const { getEmailAssetsFromDB, setEmailAssetsInDB } = await import('@/lib/server/emailAssetsStore');
    
    const saved = await withTenantIsolationContext(
      {
        source: 'admin_upload_email_asset',
        reason: 'set_email_assets',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        const current = await getEmailAssetsFromDB();
        const next = { ...current, [key]: publicUrl };
        return await setEmailAssetsInDB(next);
      }
    );

    invalidateEmailAssetsCache();

    return createSuccessResponse({ key, url: publicUrl });
  } catch (error: unknown) {
    console.error('adminUploadEmailAsset error:', error);
    // Check for 413 specifically
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('413') || errorMessage.includes('Content Too Large')) {
      return { success: false, error: 'הקובץ גדול מדי. נסה תמונה קטנה יותר.' };
    }
    return createErrorResponse(error, 'שגיאה בהעלאת קובץ');
  }
}

/**
 * Update DB with URL after direct upload to Supabase
 * Used when file was uploaded directly from browser to avoid Vercel limits
 */
export async function adminSetEmailAssetUrl(
  key: string,
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const guard = await requireSuperAdminOrFail();
    if (!guard.success) return { success: false, error: guard.error };

    if (!key || !url) {
      return { success: false, error: 'מפתח או כתובת URL חסרים' };
    }

    const { getEmailAssetsFromDB, setEmailAssetsInDB } = await import('@/lib/server/emailAssetsStore');
    
    await withTenantIsolationContext(
      {
        source: 'admin_set_email_asset_url',
        reason: 'set_email_assets',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        const current = await getEmailAssetsFromDB();
        const next = { ...current, [key]: url };
        return await setEmailAssetsInDB(next);
      }
    );

    invalidateEmailAssetsCache();

    return createSuccessResponse(undefined);
  } catch (error: unknown) {
    console.error('adminSetEmailAssetUrl error:', error);
    return createErrorResponse(error, 'שגיאה בשמירת כתובת URL');
  }
}
