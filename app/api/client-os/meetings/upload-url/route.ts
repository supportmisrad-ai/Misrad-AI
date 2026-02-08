import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { createStorageClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage, getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

function sanitizeFileName(name: string): string {
  return String(name ?? '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};

    const orgIdInput = String(bodyObj.orgId || '');
    const clientId = String(bodyObj.clientId || '');
    const fileName = String(bodyObj.fileName || 'recording');
    const mimeType = String(bodyObj.mimeType || '');

    if (!orgIdInput) return apiError('orgId is required', { status: 400 });
    if (!clientId) return apiError('clientId is required', { status: 400 });

    let orgId: string;
    try {
      const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgIdInput);
      orgId = String(workspace.id);
    } catch (e: unknown) {
      const status = getErrorStatus(e) ?? 403;
      return apiError(e, { status, message: getErrorMessage(e) || 'Forbidden' });
    }

    const bucket = 'meeting-recordings';
    const safeName = sanitizeFileName(fileName);
    const path = `${orgId}/${clientId}/${Date.now()}-${safeName}`;

    const supabase = createStorageClient();

    // Best effort: ensure bucket exists
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) throw listError;

      const exists = (buckets || []).some((b) => b.name === bucket);
      if (!exists) {
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: false,
          fileSizeLimit: 1024 * 1024 * 1024, // 1GB
        });
        if (createError) {
          // If concurrent create or permissions issue, continue and let upload fail if needed.
          console.warn('[meeting-recordings] createBucket failed:', createError.message);
        }
      }
    } catch (e: unknown) {
      console.warn('[meeting-recordings] bucket check failed:', getErrorMessage(e) || String(e));
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data?.token) {
      return apiError(error?.message || 'Failed to create signed upload URL', { status: 500 });
    }

    return apiSuccessCompat({
      bucket,
      path,
      mimeType,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: 'Failed to prepare upload' });
  }
}

export const POST = shabbatGuard(POSTHandler);
