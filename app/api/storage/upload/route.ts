/**
 * File Upload API
 * 
 * POST /api/storage/upload
 * 
 * Uploads a file to Supabase Storage and returns the public URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { getErrorMessage, getErrorStatus } from '@/lib/server/workspace-access/utils';
import prisma from '@/lib/prisma';
import { isTenantAdminRole } from '@/lib/constants/roles';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

const ATTACHMENTS_BUCKET = 'attachments';

const MAX_SIZE_5MB = 5 * 1024 * 1024;
const MAX_SIZE_50MB = 50 * 1024 * 1024;

const IMAGE_TYPES_BASIC = new Set<string>(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const IMAGE_TYPES_WITH_SVG = new Set<string>(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']);
const TASK_ALLOWED_TYPES = new Set<string>([
    ...Array.from(IMAGE_TYPES_BASIC),
    'image/gif',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm',
    'application/pdf',
]);

function normalizePathPart(v: string): string {
    return String(v || '').replace(/^\/+/, '').replace(/\/+$/, '');
}

function hasPathTraversal(v: string): boolean {
    const s = String(v || '');
    if (!s) return false;
    if (s.includes('..')) return true;
    if (s.includes('\\')) return true;
    if (s.includes('//')) return true;
    return false;
}

function isSafeSegment(seg: string): boolean {
    const s = String(seg || '').trim();
    if (!s) return false;
    if (s.length > 120) return false;
    return /^[a-zA-Z0-9._-]+$/.test(s);
}

function sanitizeSegment(seg: string): string {
    return String(seg || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function sanitizeSlug(seg: string): string {
    return String(seg || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function sanitizeExtension(ext: string): string {
    const e = String(ext || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
    return e || 'bin';
}

function getFolderPolicy(normalizedFolder: string):
    | {
          kind: 'avatars' | 'tasks' | 'client-avatars' | 'org-logos' | 'global-branding';
          maxSize: number;
          allowedTypes: Set<string>;
          requireOrgSlug: boolean;
          superAdminOnly: boolean;
          orgAdminOnly: boolean;
      }
    | null {
    const f = String(normalizedFolder || '').trim();
    if (!f) return null;

    if (f === 'avatars') {
        return {
            kind: 'avatars',
            maxSize: MAX_SIZE_5MB,
            allowedTypes: IMAGE_TYPES_BASIC,
            requireOrgSlug: true,
            superAdminOnly: false,
            orgAdminOnly: false,
        };
    }

    if (f === 'tasks') {
        return {
            kind: 'tasks',
            maxSize: MAX_SIZE_50MB,
            allowedTypes: TASK_ALLOWED_TYPES,
            requireOrgSlug: true,
            superAdminOnly: false,
            orgAdminOnly: false,
        };
    }

    if (f === 'org-logos') {
        return {
            kind: 'org-logos',
            maxSize: MAX_SIZE_5MB,
            allowedTypes: IMAGE_TYPES_WITH_SVG,
            requireOrgSlug: true,
            superAdminOnly: false,
            orgAdminOnly: true,
        };
    }

    if (f === 'global-branding') {
        return {
            kind: 'global-branding',
            maxSize: MAX_SIZE_5MB,
            allowedTypes: IMAGE_TYPES_WITH_SVG,
            requireOrgSlug: false,
            superAdminOnly: true,
            orgAdminOnly: false,
        };
    }

    if (f.startsWith('client-avatars/')) {
        const parts = f.split('/').filter(Boolean);
        if (parts.length !== 2) return null;
        if (parts[0] !== 'client-avatars') return null;
        if (!isSafeSegment(parts[1])) return null;
        return {
            kind: 'client-avatars',
            maxSize: MAX_SIZE_5MB,
            allowedTypes: IMAGE_TYPES_WITH_SVG,
            requireOrgSlug: true,
            superAdminOnly: false,
            orgAdminOnly: false,
        };
    }

    return null;
}

async function POSTHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        // 2. Parse form data
        const formData = await request.formData();
        const fileValue = formData.get('file');
        const file = fileValue instanceof File ? fileValue : null;
        const bucketValue = formData.get('bucket');
        const bucket = typeof bucketValue === 'string' && bucketValue ? bucketValue : ATTACHMENTS_BUCKET;
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

        if (String(bucket || '').trim() !== ATTACHMENTS_BUCKET) {
            return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
        }

        const normalizedFolder = folder ? normalizePathPart(folder) : '';
        if (!normalizedFolder) {
            return NextResponse.json({ error: 'Missing folder' }, { status: 400 });
        }

        if (hasPathTraversal(normalizedFolder)) {
            return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
        }

        const policy = getFolderPolicy(normalizedFolder);
        if (!policy) {
            return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
        }

        if (policy.superAdminOnly && !user.isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const mimeType = String(file.type || '').trim().toLowerCase();
        if (!mimeType || !policy.allowedTypes.has(mimeType)) {
            return NextResponse.json({ error: 'Unsupported content-type' }, { status: 400 });
        }

        if (file.size > policy.maxSize) {
            return NextResponse.json({ error: 'File too large' }, { status: 400 });
        }

        const isGlobalBranding = policy.kind === 'global-branding';

        let supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'storage_upload_default' });
        let filePath = '';

        if (isGlobalBranding) {
            supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'storage_upload_global_branding' });
        } else {
            if (policy.requireOrgSlug && (!orgSlugRaw || !String(orgSlugRaw).trim())) {
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
                                : status === 500
                                    ? 'Internal server error'
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
            const orgPrefix = `${String(workspace.id)}/${sanitizeSlug(slugSegment)}`;
            const safeUserSegment = userId ? sanitizeSegment(String(userId)) : '';
            const userSegment = safeUserSegment ? `users/${safeUserSegment}` : '';
            if (policy.orgAdminOnly && !user.isSuperAdmin) {
                const organizationId = String(workspace.id);
                const dbUser = await prisma.organizationUser.findUnique({
                    where: { clerk_user_id: String(user.id) },
                    select: { id: true, organization_id: true, role: true },
                });

                if (!dbUser?.id) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }

                const org = await prisma.social_organizations.findUnique({
                    where: { id: organizationId },
                    select: { owner_id: true },
                });

                if (!org?.owner_id) {
                    return NextResponse.json({ error: 'Not found' }, { status: 404 });
                }

                if (String(org.owner_id) !== String(dbUser.id)) {
                    const userOrgId = dbUser.organization_id ? String(dbUser.organization_id) : '';
                    const isPrimaryMembership = userOrgId === organizationId;

                    let membershipRole: string | null = String(dbUser.role || '').trim() || null;
                    if (!isPrimaryMembership) {
                        const teamMember = await prisma.teamMember.findFirst({
                            where: {
                                user_id: String(dbUser.id),
                                organization_id: organizationId,
                            },
                            select: { role: true },
                        });

                        if (!teamMember?.role) {
                            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                        }
                        membershipRole = String(teamMember.role || '').trim() || null;
                    }

                    const clerkRole = String(user.role || '').trim();
                    if (!isTenantAdminRole(clerkRole) && !isTenantAdminRole(membershipRole)) {
                        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                    }
                }
            }

            const shouldScopeToUser = policy.kind === 'avatars' || policy.kind === 'tasks';
            const parts = [orgPrefix, shouldScopeToUser ? userSegment : '', normalizedFolder].filter(Boolean);
            filePath = parts.length ? `${parts.join('/')}/` : '';

            supabase = createServiceRoleClientScoped({
                reason: 'storage_upload_org_scoped',
                scopeColumn: 'organization_id',
                scopeId: String(workspace.id),
            });
        }

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const fileExtension = sanitizeExtension(file.name.split('.').pop() || '');
        const fileName = `${timestamp}-${randomStr}.${fileExtension}`;

        if (isGlobalBranding) {
            filePath = `${normalizedFolder}/${fileName}`;
        } else {
            filePath = `${filePath}${fileName}`;
        }

        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileData, {
                contentType: mimeType,
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
