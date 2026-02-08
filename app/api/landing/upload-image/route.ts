import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { createServiceRoleStorageClient } from '@/lib/supabase';

import { getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

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

    const supabase = createServiceRoleStorageClient({ allowUnscoped: true, reason: 'landing_upload_public_assets' });
    
    const fileExt = file.name.split('.').pop();
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
