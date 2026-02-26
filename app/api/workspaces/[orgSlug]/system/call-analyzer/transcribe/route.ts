import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { logAuditEvent } from '@/lib/audit';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { createServiceRoleStorageClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';
export const maxDuration = 120;

const IS_PROD = process.env.NODE_ENV === 'production';

const CALL_RECORDINGS_BUCKET = 'call-recordings';

function hasPathTraversal(v: string): boolean {
  const s = String(v || '');
  return s.includes('..') || s.includes('\\') || s.includes('//');
}

async function resolveAudioFromRequest(
  req: Request,
  workspaceId: string
): Promise<{ audioBuffer: ArrayBuffer; mimeType: string; fileName: string; source: 'formdata' | 'storage' }> {
  const contentType = String(req.headers.get('content-type') || '');

  // JSON body → download from Supabase Storage
  if (contentType.includes('application/json')) {
    const body: unknown = await req.json();
    const obj = (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
    const bucket = String(obj.bucket || CALL_RECORDINGS_BUCKET);
    const storagePath = String(obj.path || '');
    const mimeType = String(obj.mimeType || 'audio/webm');
    const fileName = String(obj.fileName || 'recording');

    if (!storagePath) throw new APIError(400, 'path is required');

    const expectedPrefix = `${workspaceId}/`;
    if (bucket !== CALL_RECORDINGS_BUCKET || hasPathTraversal(storagePath) || !storagePath.startsWith(expectedPrefix)) {
      throw new APIError(403, 'Forbidden');
    }

    const supabase = createServiceRoleStorageClient({ reason: 'meeting-recording-download', allowUnscoped: true });
    const { data, error } = await supabase.storage.from(bucket).download(storagePath);
    if (error || !data) {
      throw new APIError(500, IS_PROD ? 'Failed to download from storage' : error?.message || 'Download failed');
    }

    const audioBuffer = await data.arrayBuffer();
    return { audioBuffer, mimeType, fileName, source: 'storage' };
  }

  // FormData body → direct file upload (for live recording chunks, small files)
  const form = await req.formData();
  const file = form.get('file');
  if (!file || !(file instanceof File)) {
    throw new APIError(400, 'file is required');
  }

  const mimeType = String(file.type || 'application/octet-stream');
  const fileName = String(file.name || 'recording');
  const audioBuffer = await file.arrayBuffer();
  return { audioBuffer, mimeType, fileName, source: 'formdata' };
}

async function POSTHandler(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { orgSlug } = resolvedParams;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params: resolvedParams });

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: 'ai.system.call_analyzer.transcribe',
      organizationId: workspace.id,
      userId: clerkUserId,
    });
    if (!abuse.ok) {
      return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
    }

    const { audioBuffer, mimeType, fileName, source } = await resolveAudioFromRequest(req, workspace.id);

    await logAuditEvent('ai.query', 'system.calls.transcription', {
      details: {
        orgSlug,
        organizationId: workspace.id,
        fileName,
        mimeType,
        source,
      },
    });

    const out = await withAiLoadIsolation({
      namespace: 'ai.transcribe',
      organizationId: workspace.id,
      task: async () => {
        const ai = AIService.getInstance();
        return await ai.transcribe({
          featureKey: 'system.calls.transcription',
          organizationId: workspace.id,
          userId: clerkUserId,
          audioBuffer,
          mimeType,
          meta: {
            module: 'system',
            source: `call-analyzer:${source}`,
            fileName,
            mimeType,
          },
        });
      },
    });

    return apiSuccess({
      transcriptText: out.text || '',
      provider: out.provider,
      model: out.model,
      chargedCents: out.chargedCents,
    }, { headers: abuse.headers });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const errName = e instanceof Error ? e.constructor.name || e.name : 'unknown';
    console.error('[system/call-analyzer/transcribe] Error:', { name: errName, message: errMsg, stack: e instanceof Error ? e.stack : undefined });

    if (e instanceof APIError) {
      const safeMsg =
        e.status === 400
          ? 'Bad request'
          : e.status === 401
            ? 'Unauthorized'
            : e.status === 404
              ? 'Not found'
              : e.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return apiError(e, { status: e.status, message: IS_PROD ? safeMsg : e.message || safeMsg });
    }
    return apiError(e, { message: `Failed to transcribe: [${errName}] ${errMsg}` });
  }
}

export const POST = shabbatGuard(POSTHandler);
