import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { createServiceRoleStorageClient } from '@/lib/supabase';

import { getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
]);
const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/webm', 'video/quicktime',
]);
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mov',
]);

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const formData = await request.formData();

    const fileValue: unknown = formData.get('file');
    const file = fileValue instanceof File ? fileValue : null;

    const typeValue: unknown = formData.get('type');
    const type = typeof typeValue === 'string' && typeValue ? typeValue : 'image'; // 'image', 'video', 'cover'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // File type validation
    const allowedTypes = type === 'video' ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Extension validation (defense-in-depth)
    const fileExt = (file.name.split('.').pop() || '').toLowerCase();
    if (!fileExt || !ALLOWED_EXTENSIONS.has(fileExt)) {
      return NextResponse.json(
        { error: 'File extension not allowed' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleStorageClient({ allowUnscoped: true, reason: 'landing_upload_public_assets' });
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const folder = type === 'video' ? 'videos' : type === 'cover' ? 'covers' : 'images';
    const filePath = `landing/${folder}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      if (IS_PROD) console.error('Supabase upload error');
      else console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: unknown) {
    if (IS_PROD) console.error('Error uploading image');
    else console.error('Error uploading image:', error);
    const status = getUnknownErrorMessage(error).includes('Forbidden') ? 403 : 500;
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status }
    );
  }
}
