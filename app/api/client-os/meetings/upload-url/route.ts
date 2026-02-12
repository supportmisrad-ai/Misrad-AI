import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { createStorageClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { asObject, getErrorMessage, getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

const MEETING_RECORDINGS_BUCKET = 'meeting-recordings';
const MAX_MEETING_RECORDING_SIZE = 1024 * 1024 * 1024; // 1GB

function hasPathTraversal(v: string): boolean {
  const s = String(v || '');
  if (!s) return false;
  if (s.includes('..')) return true;
  if (s.includes('\\')) return true;
  if (s.includes('//')) return true;
  return false;
}

function isSafeIdSegment(seg: string): boolean {
  const s = String(seg || '').trim();
  if (!s) return false;
  if (s.length > 120) return false;
  return /^[a-zA-Z0-9_-]+$/.test(s);
}

function sanitizeFileName(name: string): string {
  return String(name ?? '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};

    const bodyOrgKey = String(bodyObj.orgId || '').trim();
    let headerOrgKey = '';
    try {
      headerOrgKey = getOrgKeyOrThrow(req);
    } catch {
      headerOrgKey = '';
    }
    const orgKey = headerOrgKey || bodyOrgKey;
    const clientId = String(bodyObj.clientId || '');
    const fileName = String(bodyObj.fileName || 'recording');
    const mimeType = String(bodyObj.mimeType || '');
    const fileSize = Number(bodyObj.fileSize ?? NaN);

    if (!orgKey) return apiError('orgId is required', { status: 400 });
    if (!clientId) return apiError('clientId is required', { status: 400 });

    if (!isSafeIdSegment(clientId)) {
      return apiError('Invalid clientId', { status: 400 });
    }

    const mime = String(mimeType || '').trim().toLowerCase();
    const isAudio = mime.startsWith('audio/');
    const isVideo = mime.startsWith('video/');
    if (!isAudio && !isVideo) {
      return apiError('Only audio/video files are supported', { status: 400 });
    }

    if (Number.isFinite(fileSize) && fileSize > MAX_MEETING_RECORDING_SIZE) {
      return apiError('File too large', { status: 400 });
    }

    let orgId: string;
    try {
      const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgKey);
      orgId = String(workspace.id);
    } catch (e: unknown) {
      const status = getErrorStatus(e) ?? 403;
      const safeMsg = 'Forbidden';
      return apiError(e, { status, message: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg });
    }

    if (headerOrgKey && bodyOrgKey && headerOrgKey !== bodyOrgKey) {
      try {
        const otherKey = headerOrgKey === orgKey ? bodyOrgKey : headerOrgKey;
        const { workspace: otherWorkspace } = await getWorkspaceByOrgKeyOrThrow(otherKey);
        if (String(otherWorkspace.id) !== String(orgId)) {
          return apiError('Conflicting workspace context', { status: 400 });
        }
      } catch {
        return apiError('Conflicting workspace context', { status: 400 });
      }
    }

    const bucket = MEETING_RECORDINGS_BUCKET;
    const safeName = sanitizeFileName(fileName);
    const path = `${orgId}/${clientId}/${Date.now()}-${safeName}`;

    if (hasPathTraversal(path)) {
      return apiError('Invalid path', { status: 400 });
    }

    const supabase = createStorageClient();

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data?.token) {
      const safeMsg = 'Failed to create signed upload URL';
      return apiError(IS_PROD ? safeMsg : error?.message || safeMsg, { status: 500 });
    }

    return apiSuccessCompat({
      bucket,
      path,
      mimeType: mime,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: 'Failed to prepare upload' });
  }
}

export const POST = shabbatGuard(POSTHandler);
