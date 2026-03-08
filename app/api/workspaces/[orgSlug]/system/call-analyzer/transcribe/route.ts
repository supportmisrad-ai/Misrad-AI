import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { formatTranscriptText } from '@/lib/services/ai/format-transcript';
import { proofreadHebrewTranscript } from '@/lib/services/ai/proofread-transcript';
import { logAuditEvent } from '@/lib/audit';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { createServiceRoleStorageClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';
export const maxDuration = 120;

const IS_PROD = process.env.NODE_ENV === 'production';

const CALL_RECORDINGS_BUCKET = 'call-recordings';

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
  'audio/ogg', 'audio/webm', 'audio/flac', 'application/octet-stream',
]);

function normalizeMimeType(mime: string, fileName: string): string {
  const m = (mime || '').toLowerCase();
  if (m && ALLOWED_AUDIO_MIMES.has(m) && m !== 'application/octet-stream') return m;
  const ext = (fileName || '').toLowerCase();
  if (ext.endsWith('.mp3')) return 'audio/mpeg';
  if (ext.endsWith('.wav')) return 'audio/wav';
  if (ext.endsWith('.m4a')) return 'audio/mp4';
  if (ext.endsWith('.aac')) return 'audio/aac';
  if (ext.endsWith('.ogg')) return 'audio/ogg';
  if (ext.endsWith('.webm')) return 'audio/webm';
  if (ext.endsWith('.flac')) return 'audio/flac';
  if (m && m.startsWith('audio/')) return m;
  return 'audio/mpeg';
}

function userFriendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('AbortError'))
    return '\u05d4\u05e9\u05e8\u05ea \u05e2\u05de\u05d5\u05e1 \u05db\u05e8\u05d2\u05e2 \u05d5\u05dc\u05d0 \u05d4\u05e6\u05dc\u05d7\u05e0\u05d5 \u05dc\u05ea\u05de\u05dc\u05dc \u05d1\u05d6\u05de\u05df. \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1 \u05d1\u05e2\u05d5\u05d3 \u05d3\u05e7\u05d4.';
  if (msg.includes('quota') || msg.includes('429') || msg.includes('rate'))
    return '\u05d7\u05e8\u05d2\u05ea \u05de\u05de\u05db\u05e1\u05d4 \u05d4\u05e9\u05d9\u05de\u05d5\u05e9 \u05d1-AI. \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1 \u05d1\u05e2\u05d5\u05d3 \u05db\u05de\u05d4 \u05d3\u05e7\u05d5\u05ea.';
  if (msg.includes('key') || msg.includes('API key') || msg.includes('credentials'))
    return '\u05d1\u05e2\u05d9\u05d4 \u05d1\u05d4\u05d2\u05d3\u05e8\u05ea \u05de\u05e4\u05ea\u05d7\u05d5\u05ea AI. \u05e4\u05e0\u05d4 \u05dc\u05ea\u05de\u05d9\u05db\u05d4.';
  if (msg.includes('empty') || msg.includes('\u05e8\u05d9\u05e7'))
    return '\u05d4\u05e7\u05d5\u05d1\u05e5 \u05e8\u05d9\u05e7 \u05d0\u05d5 \u05dc\u05d0 \u05de\u05db\u05d9\u05dc \u05e9\u05de\u05e2. \u05d1\u05d3\u05d5\u05e7 \u05e9\u05d4\u05e7\u05d5\u05d1\u05e5 \u05ea\u05e7\u05d9\u05df \u05d5\u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1.';
  return `\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05ea\u05de\u05dc\u05d5\u05dc: ${msg}`;
}

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

  const rawMime = String(file.type || 'application/octet-stream');
  const fileName = String(file.name || 'recording');
  const mimeType = normalizeMimeType(rawMime, fileName);
  const audioBuffer = await file.arrayBuffer();
  if (audioBuffer.byteLength === 0) throw new APIError(400, '\u05d4\u05e7\u05d5\u05d1\u05e5 \u05e8\u05d9\u05e7. \u05d1\u05d7\u05e8 \u05e7\u05d5\u05d1\u05e5 \u05e9\u05de\u05e2 \u05ea\u05e7\u05d9\u05df.');
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

    let transcriptText = formatTranscriptText(String(out.text || '').trim());
    if (!transcriptText) {
      console.warn('[system/call-analyzer/transcribe] AI returned empty transcript', {
        provider: out.provider,
        model: out.model,
        fileName,
        mimeType,
        source,
        bufferSize: audioBuffer.byteLength,
      });
      return apiError('הקובץ ריק או לא מכיל שמע ברור. בדוק שהקובץ תקין ונסה שוב.', { status: 422 });
    }

    // Best-effort Hebrew spelling correction
    transcriptText = await proofreadHebrewTranscript(transcriptText);

    return apiSuccess({
      transcriptText,
      provider: out.provider,
      model: out.model,
      chargedCents: out.chargedCents,
    }, { headers: abuse.headers });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const errName = e instanceof Error ? e.constructor.name || e.name : 'unknown';
    console.error('[system/call-analyzer/transcribe] Error:', { name: errName, message: errMsg, stack: e instanceof Error ? e.stack : undefined });

    if (e instanceof APIError) {
      return apiError(e, { status: e.status, message: e.message || userFriendlyError(e) });
    }
    return apiError(e, { status: 500, message: userFriendlyError(e) });
  }
}

export const POST = shabbatGuard(POSTHandler);
