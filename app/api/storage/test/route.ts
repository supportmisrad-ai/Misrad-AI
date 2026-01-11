/**
 * Storage Test API
 * 
 * GET /api/storage/test
 * 
 * Tests Supabase Storage connection and permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../lib/auth';
import { supabase } from '../../../../lib/supabase';
import { uploadFile, listFiles, deleteFile } from '../../../../lib/storage';

export async function GET(request: NextRequest) {
    try {
        try {
            await requireSuperAdmin();
        } catch (e: any) {
            return NextResponse.json({
                success: false,
                error: e?.message || 'Forbidden - Super Admin required',
                checks: {}
            }, { status: 403 });
        }

        // 1. Check if Supabase is configured
        if (!supabase) {
            return NextResponse.json({
                success: false,
                error: 'Supabase not configured',
                checks: {
                    supabaseConfigured: false,
                    bucketExists: false,
                    canUpload: false,
                    canRead: false,
                    canDelete: false
                }
            }, { status: 500 });
        }

        // 2. Authenticate user
        const user = await getAuthenticatedUser();

        const checks: Record<string, boolean | string> = {
            supabaseConfigured: true,
            authenticated: true,
            bucketExists: false,
            canUpload: false,
            canRead: false,
            canDelete: false
        };

        // 3. Check if bucket exists
        try {
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();
            if (listError) {
                checks.bucketExists = `Error: ${listError.message}`;
            } else {
                const attachmentsBucket = buckets?.find(b => b.name === 'attachments');
                checks.bucketExists = !!attachmentsBucket;
                if (attachmentsBucket) {
                    checks.bucketPublic = attachmentsBucket.public;
                }
            }
        } catch (error: any) {
            checks.bucketExists = `Error: ${error.message}`;
        }

        // 4. Test upload (small test file)
        try {
            const testContent = `Test file created at ${new Date().toISOString()}`;
            const testBlob = new Blob([testContent], { type: 'text/plain' });
            const testFile = new File([testBlob], 'test-upload.txt', { type: 'text/plain' });

            const uploadResult = await uploadFile(testFile, 'attachments', 'test', user.id);
            if (uploadResult.error) {
                checks.canUpload = `Error: ${uploadResult.error}`;
            } else if (uploadResult.url) {
                checks.canUpload = true;
                checks.uploadedFileUrl = uploadResult.url;
                checks.uploadedFilePath = uploadResult.path;

                // 5. Test read (list files)
                try {
                    const files = await listFiles(`test/${user.id}`, 'attachments');
                    checks.canRead = files.length > 0;
                    checks.filesFound = files.length;
                } catch (readError: any) {
                    checks.canRead = `Error: ${readError.message}`;
                }

                // 6. Test delete
                try {
                    const deleted = await deleteFile(uploadResult.path, 'attachments');
                    checks.canDelete = deleted;
                } catch (deleteError: any) {
                    checks.canDelete = `Error: ${deleteError.message}`;
                }
            } else {
                checks.canUpload = 'Upload returned no URL';
            }
        } catch (uploadError: any) {
            checks.canUpload = `Error: ${uploadError.message}`;
        }

        // 7. Summary
        const allChecksPassed = 
            checks.bucketExists === true &&
            checks.canUpload === true &&
            checks.canRead === true &&
            checks.canDelete === true;

        return NextResponse.json({
            success: allChecksPassed,
            message: allChecksPassed 
                ? 'All storage checks passed! ✅' 
                : 'Some checks failed. See details below.',
            checks,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error: any) {
        console.error('[API] Storage test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Test failed',
            checks: {}
        }, { status: 500 });
    }
}

