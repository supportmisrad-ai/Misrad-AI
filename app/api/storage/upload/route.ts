/**
 * File Upload API
 * 
 * POST /api/storage/upload
 * 
 * Uploads a file to Supabase Storage and returns the public URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { uploadFile } from '../../../../lib/storage';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        // 2. Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string || 'attachments';
        const folder = formData.get('folder') as string || undefined;
        const requestedUserId = formData.get('userId') as string | null;
        const userId = user.isSuperAdmin && requestedUserId ? requestedUserId : user.id;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // 3. Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 50MB' },
                { status: 400 }
            );
        }

        // 4. Upload file
        const result = await uploadFile(file, bucket, folder, userId);

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        // 5. Return success with file info
        return NextResponse.json({
            success: true,
            url: result.url,
            path: result.path,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });

    } catch (error: any) {
        console.error('[API] Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}

