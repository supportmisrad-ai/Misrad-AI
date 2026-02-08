import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Storage Test API
 * 
 * GET /api/storage/test
 * 
 * Tests Supabase Storage connection and permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../lib/auth';
import { createServiceRoleClient, isSupabaseConfigured } from '../../../../lib/supabase';
import { uploadFile, listFiles, deleteFile } from '../../../../lib/storage';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

type StorageBucket = { name: string; public?: boolean };

type SupabaseStorageClientLike = {
    listBuckets: () => Promise<{ data: StorageBucket[] | null; error: { message: string } | null }>;
};

type SupabaseClientLike = {
    storage: SupabaseStorageClientLike;
};

function isSupabaseClientLike(value: unknown): value is SupabaseClientLike {
    const obj = asObject(value);
    if (!obj) return false;
    const storage = asObject(obj.storage);
    if (!storage) return false;
    return typeof storage.listBuckets === 'function';
}

async function GETHandler(request: NextRequest) {
    try {
        try {
            await requireSuperAdmin();
        } catch (e: unknown) {
            return NextResponse.json({
                success: false,
                error: getErrorMessage(e) || 'Forbidden - Super Admin required',
                checks: {}
            }, { status: 403 });
        }

        // 1. Check if Supabase is configured
        if (!isSupabaseConfigured()) {
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

        let supabase: SupabaseClientLike;
        try {
            const candidate = createServiceRoleClient({ allowUnscoped: true, reason: 'storage_test_admin' });
            if (!isSupabaseClientLike(candidate)) {
                throw new Error('Supabase service role client is missing storage.listBuckets');
            }
            supabase = candidate;
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Supabase service role is not configured',
                checks: {},
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
                const attachmentsBucket = buckets?.find((b) => b.name === 'attachments');
                checks.bucketExists = !!attachmentsBucket;
                if (attachmentsBucket) {
                    checks.bucketPublic = Boolean(attachmentsBucket.public);
                }
            }
        } catch (error: unknown) {
            checks.bucketExists = `Error: ${getErrorMessage(error)}`;
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
                    const files = await listFiles(`${user.id}/test`, 'attachments');
                    checks.canRead = files.length > 0;
                    checks.filesFound = String(files.length);
                } catch (readError: unknown) {
                    checks.canRead = `Error: ${getErrorMessage(readError)}`;
                }

                // 6. Test delete
                try {
                    const deleted = await deleteFile(uploadResult.path, 'attachments');
                    checks.canDelete = deleted;
                } catch (deleteError: unknown) {
                    checks.canDelete = `Error: ${getErrorMessage(deleteError)}`;
                }
            } else {
                checks.canUpload = 'Upload returned no URL';
            }
        } catch (uploadError: unknown) {
            checks.canUpload = `Error: ${getErrorMessage(uploadError)}`;
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

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Storage test error');
        else console.error('[API] Storage test error:', error);
        const safeMsg = 'Test failed';
        return NextResponse.json({
            success: false,
            error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg,
            checks: {}
        }, { status: 500 });
    }
}


export const GET = shabbatGuard(GETHandler);
