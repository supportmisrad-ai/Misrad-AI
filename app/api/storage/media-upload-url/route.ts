import { NextRequest } from 'next/server';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { createServiceRoleStorageClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { getErrorMessage, getErrorStatus } from '@/lib/server/workspace-access/utils';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject } from '@/lib/shared/unknown';

export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

const MEDIA_BUCKET = 'media';
const MAX_MEDIA_SIZE = 1024 * 1024 * 1024; // 1GB

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
]);
const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
]);
const ALLOWED_DOCUMENT_TYPES = new Set(['application/pdf']);

function hasPathTraversal(v: string): boolean {
  const s = String(v || '');
  return s.includes('..') || s.includes('\\') || s.includes('//');
}

function sanitizeFileName(name: string): string {
  return String(name ?? '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 160);
}

/**
 * POST /api/storage/media-upload-url
 * 
 * Returns a signed upload URL for uploading media files directly to Supabase Storage.
 * This bypasses Vercel's 4.5MB body limit — the file goes straight from browser to Supabase.
 * 
 * Body: { orgSlug, fileName, mimeType, fileSize, folder? }
 * Returns: { bucket, path, mimeType, signedUrl, token }
 */
async function POSTHandler(req: NextRequest) {
  try {
    await getAuthenticatedUser();

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const body = asObject(bodyJson) ?? {};

    const orgSlug = String(body.orgSlug || '').trim();
    const fileName = String(body.fileName || 'upload');
    const mimeType = String(body.mimeType || '').trim().toLowerCase();
    const fileSize = Number(body.fileSize ?? NaN);
    const folder = String(body.folder || 'media').trim();

    if (!orgSlug) return apiError('orgSlug is required', { status: 400 });

    // Validate mime type
    const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
    const isDocument = ALLOWED_DOCUMENT_TYPES.has(mimeType);

    if (!isImage && !isVideo && !isDocument) {
      return apiError('סוג קובץ לא נתמך. מותר: תמונות (JPG, PNG, GIF, WebP), וידאו (MP4, MOV, WebM), או PDF', { status: 400 });
    }

    if (Number.isFinite(fileSize) && fileSize > MAX_MEDIA_SIZE) {
      return apiError('הקובץ גדול מדי (מקסימום 1GB)', { status: 400 });
    }

    let orgId: string;
    try {
      const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgSlug);
      orgId = String(workspace.id);
    } catch (e: unknown) {
      const status = getErrorStatus(e) ?? 403;
      return apiError(e, { status, message: IS_PROD ? 'Forbidden' : getErrorMessage(e) || 'Forbidden' });
    }

    const safeName = sanitizeFileName(fileName);
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `${orgId}/${safeFolder}/${Date.now()}-${safeName}`;

    if (hasPathTraversal(path)) {
      return apiError('Invalid path', { status: 400 });
    }

    const supabase = createServiceRoleStorageClient({ reason: 'storage_default_client', allowUnscoped: true });

    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data?.token) {
      const safeMsg = 'שגיאה ביצירת קישור העלאה';
      return apiError(IS_PROD ? safeMsg : error?.message || safeMsg, { status: 500 });
    }

    return apiSuccessCompat({
      bucket: MEDIA_BUCKET,
      path,
      mimeType,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  } catch (e: unknown) {
    console.error('[media-upload-url] Failed:', e instanceof Error ? e.message : e);
    return apiError(e, { status: 500, message: 'Failed to prepare upload' });
  }
}

export const POST = shabbatGuard(POSTHandler);
