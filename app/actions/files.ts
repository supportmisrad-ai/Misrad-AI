'use server';

import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { auth } from '@clerk/nextjs/server';
import { translateError } from '@/lib/errorTranslations';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

const CALL_RECORDINGS_BUCKET = 'call-recordings';
const MAX_CALL_RECORDING_SIZE = 200 * 1024 * 1024; // 200MB

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  bucket?: string;
  signedUrl?: string;
  error?: string;
}

async function ensureBucketExists(supabase: ReturnType<typeof createClient>, bucketName: string) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(listError.message || 'Failed to list storage buckets');
  }

  const exists = Array.isArray(buckets) && buckets.some((b: any) => String(b?.name || '') === bucketName);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(bucketName, { public: false });
  if (createError) {
    throw new Error(createError.message || `Failed to create bucket ${bucketName}`);
  }
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  file: File | Blob,
  fileName: string,
  folder: 'posts' | 'ideas' | 'requests' | 'media' = 'media'
): Promise<UploadResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה בקבלת משתמש' };
    }
    const supabaseUserId = userResult.userId;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'הקובץ גדול מדי (מקסימום 50MB)' };
    }

    // Validate file type
    const fileType = file.type || '';
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType);
    const isDocument = ALLOWED_DOCUMENT_TYPES.includes(fileType);

    if (!isImage && !isVideo && !isDocument) {
      return { 
        success: false, 
        error: 'סוג קובץ לא נתמך. מותר: תמונות (JPG, PNG, GIF, WebP), וידאו (MP4, MOV, WebM), או PDF' 
      };
    }

    const supabase = createClient();

    // Generate unique file name: {userId}/{folder}/{timestamp}-{originalName}
    const timestamp = Date.now();
    const sanitizedFileName = String(fileName ?? '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${supabaseUserId}/${folder}/${timestamp}-${sanitizedFileName}`;

    // Convert File/Blob to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, fileBuffer, {
        contentType: fileType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('Storage upload error:', error);
      const raw = String((error as any)?.message || '').toLowerCase();
      if (raw.includes('bucket') && raw.includes('not') && raw.includes('found')) {
        return {
          success: false,
          error: 'לא ניתן להעלות קובץ: חסר Supabase Storage bucket בשם media. יש ליצור bucket בשם media (Public או עם מדיניות מתאימה).',
        };
      }
      if (raw.includes('permission') || raw.includes('not authorized') || raw.includes('rls') || raw.includes('row-level')) {
        return {
          success: false,
          error: 'אין הרשאות להעלאת קבצים (Storage/RLS). נא לוודא מדיניות הרשאות ל-bucket media או שימוש ב-Service Role במקומות המתאימים.',
        };
      }
      return { 
        success: false, 
        error: translateError(error.message || 'שגיאה בהעלאת הקובץ') 
      };
    }

    // Return a stable reference + short-lived signed URL (bucket is private)
    const ref = `sb://media/${filePath}`;
    const { data: signedData } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, 60 * 60)
      .catch(() => ({ data: null as any }));

    const signedUrl = signedData?.signedUrl ? String(signedData.signedUrl) : undefined;

    return {
      success: true,
      url: ref,
      signedUrl,
      path: filePath,
      bucket: 'media',
    };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return { 
      success: false, 
      error: translateError(error.message || 'שגיאה בהעלאת הקובץ') 
    };
  }
}

export async function uploadCallRecordingFile(
  file: File | Blob,
  fileName: string,
  leadId: string,
  orgSlug: string
): Promise<UploadResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = String(workspace.id);

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה בקבלת משתמש' };
    }

    const supabaseUserId = userResult.userId;

    if (file.size > MAX_CALL_RECORDING_SIZE) {
      return { success: false, error: 'הקובץ גדול מדי (מקסימום 200MB)' };
    }

    const fileType = String((file as any)?.type || '');
    if (!fileType.startsWith('audio/')) {
      return { success: false, error: 'סוג קובץ לא נתמך. מותר: קבצי אודיו בלבד (MP3/WAV/M4A וכו׳).' };
    }

    const supabase = createClient();
    await ensureBucketExists(supabase, CALL_RECORDINGS_BUCKET);

    const timestamp = Date.now();
    const sanitizedFileName = String(fileName ?? '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeLeadId = String(leadId ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${organizationId}/users/${supabaseUserId}/system-leads/${safeLeadId}/${timestamp}-${sanitizedFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage.from(CALL_RECORDINGS_BUCKET).upload(filePath, fileBuffer, {
      contentType: fileType || 'application/octet-stream',
      upsert: false,
    });

    if (error) {
      console.error('Storage upload error:', error);
      const raw = String((error as any)?.message || '').toLowerCase();
      if (raw.includes('permission') || raw.includes('not authorized') || raw.includes('rls') || raw.includes('row-level')) {
        return {
          success: false,
          error: 'אין הרשאות להעלאת הקלטות (Storage/RLS). נא לוודא מדיניות הרשאות ל-bucket call-recordings או שימוש ב-Service Role במקומות המתאימים.',
        };
      }
      return { success: false, error: translateError(error.message || 'שגיאה בהעלאת הקובץ') };
    }

    const ref = `sb://${CALL_RECORDINGS_BUCKET}/${filePath}`;
    const { data: signedData } = await supabase.storage
      .from(CALL_RECORDINGS_BUCKET)
      .createSignedUrl(filePath, 60 * 60)
      .catch(() => ({ data: null as any }));

    const signedUrl = signedData?.signedUrl ? String(signedData.signedUrl) : undefined;

    return {
      success: true,
      url: ref,
      signedUrl,
      path: filePath,
      bucket: CALL_RECORDINGS_BUCKET,
    };
  } catch (error: any) {
    console.error('Error uploading call recording:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בהעלאת הקובץ') };
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabase = createClient();

    // Extract bucket and path
    const { data, error } = await supabase.storage
      .from('media')
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return { 
        success: false, 
        error: translateError(error.message || 'שגיאה במחיקת הקובץ') 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return { 
      success: false, 
      error: translateError(error.message || 'שגיאה במחיקת הקובץ') 
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: (File | Blob)[],
  folder: 'posts' | 'ideas' | 'requests' | 'media' = 'media'
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map((file, index) => 
      uploadFile(file, `file-${index}.${file.type.split('/')[1] || 'bin'}`, folder)
    )
  );
  return results;
}

