import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createServiceRoleStorageClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

const CALL_RECORDINGS_BUCKET = 'call-recordings';
const MAX_CALL_RECORDING_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

function hasPathTraversal(v: string): boolean {
  const s = String(v || '');
  if (!s) return false;
  if (s.includes('..')) return true;
  if (s.includes('\\')) return true;
  if (s.includes('//')) return true;
  return false;
}

function sanitizeFileName(name: string): string {
  return String(name ?? '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

async function POSTHandler(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  try {
    await getAuthenticatedUser();

    const resolvedParams = await Promise.resolve(params);
    const { orgSlug } = resolvedParams;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params: resolvedParams });
    const orgId = String(workspace.id);

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const body = (bodyJson && typeof bodyJson === 'object' && !Array.isArray(bodyJson) ? bodyJson : {}) as Record<string, unknown>;

    const fileName = String(body.fileName || 'recording');
    const mimeType = String(body.mimeType || '').trim().toLowerCase();
    const fileSize = Number(body.fileSize ?? NaN);

    const isAudio = mimeType.startsWith('audio/');
    const isVideo = mimeType.startsWith('video/');
    if (!isAudio && !isVideo) {
      return apiError('ניתן להעלות קבצי שמע/וידאו בלבד', { status: 400 });
    }

    if (Number.isFinite(fileSize) && fileSize > MAX_CALL_RECORDING_SIZE) {
      return apiError('הקובץ גדול מדי (מקסימום 2GB)', { status: 400 });
    }

    const bucket = CALL_RECORDINGS_BUCKET;
    const safeName = sanitizeFileName(fileName);
    const path = `${orgId}/system-calls/${Date.now()}-${safeName}`;

    if (hasPathTraversal(path)) {
      return apiError('Invalid path', { status: 400 });
    }

    const supabase = createServiceRoleStorageClient({ reason: 'meeting-recording-signed-upload', allowUnscoped: true });

    // Ensure bucket exists (idempotent)
    const { error: bucketError } = await supabase.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: MAX_CALL_RECORDING_SIZE,
    });
    if (bucketError && !String(bucketError.message ?? '').toLowerCase().includes('already exists')) {
      console.error('[system/call-analyzer/upload-url] Bucket creation failed:', bucketError.message);
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data?.token) {
      const safeMsg = 'שגיאה ביצירת קישור העלאה';
      return apiError(IS_PROD ? safeMsg : error?.message || safeMsg, { status: 500 });
    }

    return apiSuccess({
      bucket,
      path,
      mimeType,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg =
        e.status === 400 ? 'Bad request'
          : e.status === 401 ? 'Unauthorized'
            : e.status === 404 ? 'Not found'
              : e.status === 500 ? 'Internal server error'
                : 'Forbidden';
      return apiError(e, { status: e.status, message: IS_PROD ? safeMsg : e.message || safeMsg });
    }
    console.error('[system/call-analyzer/upload-url] Error:', e instanceof Error ? e.message : e);
    return apiError(e, { status: 500, message: 'Failed to prepare upload' });
  }
}

export const POST = shabbatGuard(POSTHandler);
