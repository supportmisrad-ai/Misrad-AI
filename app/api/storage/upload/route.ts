/**
 * File Upload API
 * 
 * POST /api/storage/upload
 * 
 * Uploads a file to Supabase Storage and returns the public URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(request: NextRequest) {
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
        const supabase = createClient();

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop() || 'bin';
        const fileName = `${timestamp}-${randomStr}.${fileExtension}`;

        let filePath = '';
        if (userId && folder) {
            filePath = `${userId}/${folder}/${fileName}`;
        } else if (userId) {
            filePath = `${userId}/${fileName}`;
        } else if (folder) {
            filePath = `${folder}/${fileName}`;
        } else {
            filePath = fileName;
        }

        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileData, {
                contentType: file.type || 'application/octet-stream',
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json(
                { error: uploadError.message },
                { status: 500 }
            );
        }

        const ref = `sb://${bucket}/${filePath}`;

        let signedUrl: string | null = null;
        try {
            const { data: signedData, error: signedErr } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 60 * 60);
            if (!signedErr && signedData?.signedUrl) signedUrl = String(signedData.signedUrl);
        } catch {
            // ignore
        }

        // 5. Return success with file info
        return NextResponse.json({
            success: true,
            url: signedUrl || ref,
            signedUrl: signedUrl || undefined,
            ref,
            path: filePath,
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


export const POST = shabbatGuard(POSTHandler);
