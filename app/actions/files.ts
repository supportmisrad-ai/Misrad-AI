'use server';

import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { auth } from '@clerk/nextjs/server';
import { translateError } from '@/lib/errorTranslations';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return { 
      success: false, 
      error: translateError(error.message || 'שגיאה בהעלאת הקובץ') 
    };
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

