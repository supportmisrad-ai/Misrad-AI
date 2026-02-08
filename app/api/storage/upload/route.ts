/**
 * File Upload API
 * 
 * POST /api/storage/upload
 * 
 * Uploads a file to Supabase Storage and returns the public URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { getErrorMessage, getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        // 2. Parse form data
        const formData = await request.formData();
        const fileValue = formData.get('file');
        const file = fileValue instanceof File ? fileValue : null;
        const bucketValue = formData.get('bucket');
        const bucket = typeof bucketValue === 'string' && bucketValue ? bucketValue : 'attachments';
        const folderValue = formData.get('folder');
        const folder = typeof folderValue === 'string' && folderValue ? folderValue : undefined;
        const orgSlugValue = formData.get('orgSlug');
        const orgSlugRaw = typeof orgSlugValue === 'string' ? orgSlugValue : null;
        const requestedUserIdValue = formData.get('userId');
        const requestedUserId = typeof requestedUserIdValue === 'string' ? requestedUserIdValue : null;
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
        const normalizePathPart = (v: string) => String(v || '').replace(/^\/+/, '').replace(/\/+$/, '');
        const normalizedFolder = folder ? normalizePathPart(folder) : '';

        const isGlobalBranding =
            String(bucket || '').trim() === 'attachments' &&
            (normalizedFolder === 'global-branding' || normalizedFolder.startsWith('global-branding/'));

        let supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'storage_upload_default' });
        let filePath = '';

        if (isGlobalBranding) {
            if (!user.isSuperAdmin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'storage_upload_global_branding' });
        } else {
            if (!orgSlugRaw || !String(orgSlugRaw).trim()) {
                return NextResponse.json({ error: 'Missing orgSlug' }, { status: 400 });
            }

            let workspace;
            try {
                ({ workspace } = await getWorkspaceByOrgKeyOrThrow(String(orgSlugRaw)));
            } catch (e: unknown) {
                const status = getErrorStatus(e) ?? 403;
                const safeMsg =
                    status === 400
                        ? 'Bad request'
                        : status === 401
                            ? 'Unauthorized'
                            : status === 404
                                ? 'Not found'
                                : 'Forbidden';
                return NextResponse.json({ error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg }, { status });
            }

            let decodedOrgSlug = String(orgSlugRaw);
            try {
                decodedOrgSlug = decodeURIComponent(String(orgSlugRaw));
            } catch {
                decodedOrgSlug = String(orgSlugRaw);
            }

            const slugSegment = String(workspace.slug || decodedOrgSlug).trim();
            const orgPrefix = `${String(workspace.id)}/${slugSegment}`;
            const userSegment = userId ? `users/${String(userId)}` : '';
            const parts = [orgPrefix, userSegment, normalizedFolder].filter(Boolean);
            filePath = parts.length ? `${parts.join('/')}/` : '';

            supabase = createServiceRoleClientScoped({
                reason: 'storage_upload_org_scoped',
                scopeColumn: 'organization_id',
                scopeId: String(workspace.id),
            });
        }

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop() || 'bin';
        const fileName = `${timestamp}-${randomStr}.${fileExtension}`;

        if (isGlobalBranding) {
            filePath = `${normalizedFolder ? `${normalizedFolder}/` : ''}${fileName}`;
        } else {
            filePath = `${filePath}${fileName}`;
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
            const safeMsg = 'Upload failed';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : uploadError.message || safeMsg },
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

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Upload error');
        else console.error('[API] Upload error:', error);
        const safeMsg = 'Upload failed';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
