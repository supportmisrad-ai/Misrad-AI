import { createServiceRoleClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { currentUser } from '@clerk/nextjs/server';
import { asObject } from '@/lib/shared/unknown';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Check if user is super admin
 */
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
  const role = meta?.role;

  if (role !== 'super_admin') {
    return { success: false, error: 'נדרשת הרשאת סופר אדמין' };
  }

  return { success: true, userId: authCheck.userId || '' };
}

/**
 * Create a signed upload URL for direct Supabase Storage upload
 * This bypasses Vercel's body size limit by uploading directly from browser to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const guard = await requireSuperAdminOrFail();
    if (!guard.success) {
      return NextResponse.json(
        { success: false, error: guard.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { key, fileType, fileSize } = body;

    if (!key || !fileType) {
      return NextResponse.json(
        { success: false, error: 'חסר מפתח או סוג קובץ' },
        { status: 400 }
      );
    }

    // Server-side validation: max 20MB for direct upload
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          error: `הקובץ גדול מדי (${(fileSize / 1024 / 1024).toFixed(1)}MB). מקסימום: 20MB.`
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: `פורמט לא נתמך: ${fileType}` },
        { status: 400 }
      );
    }

    // Initialize Supabase Service Role client
    const supabase = createServiceRoleClient({
      reason: 'storage_upload_email_assets_direct',
      allowUnscoped: true,
    });

    // Generate unique file path
    const fileExt = fileType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fileName = `${key}-${Date.now()}.${fileExt}`;
    const filePath = `email-assets/${fileName}`;

    // Create signed URL with 2-minute expiry (plenty of time for upload)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('public')
      .createSignedUploadUrl(filePath);

    if (signedError || !signedData?.token || !signedData?.path) {
      console.error('Failed to create signed URL:', signedError);
      return NextResponse.json(
        { success: false, error: 'שגיאה ביצירת קישור העלאה' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: signedData.signedUrl,
        token: signedData.token,
        path: signedData.path,
        publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public/${signedData.path}`,
        key,
      },
    });

  } catch (error) {
    console.error('Direct upload URL error:', error);
    return NextResponse.json(
      { success: false, error: 'שגיאת שרת' },
      { status: 500 }
    );
  }
}
