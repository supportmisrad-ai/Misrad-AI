import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { logAuditEvent } from '@/lib/audit';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';
export const maxDuration = 120;

const IS_PROD = process.env.NODE_ENV === 'production';

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

async function POSTHandler(req: Request, { params }: { params: { orgSlug: string } }) {
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
      namespace: 'ai.workspaces.transcribe',
      organizationId: workspace.id,
      userId: clerkUserId,
    });
    if (!abuse.ok) {
      return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return apiError('file is required', { status: 400 });
    }

    const rawMime = String(file.type || 'application/octet-stream');
    const fileName = String(file.name || 'recording');
    const mimeType = normalizeMimeType(rawMime, fileName);

    await logAuditEvent('ai.query', 'workspaces.transcription', {
      details: {
        orgSlug,
        organizationId: workspace.id,
        fileName,
        mimeType,
      },
    });

    const audioBuffer = await file.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      return apiError('\u05d4\u05e7\u05d5\u05d1\u05e5 \u05e8\u05d9\u05e7. \u05d1\u05d7\u05e8 \u05e7\u05d5\u05d1\u05e5 \u05e9\u05de\u05e2 \u05ea\u05e7\u05d9\u05df.', { status: 400 });
    }

    const out = await withAiLoadIsolation({
      namespace: 'ai.transcribe',
      organizationId: workspace.id,
      task: async () => {
        const ai = AIService.getInstance();
        return await ai.transcribe({
          featureKey: 'workspaces.transcription',
          organizationId: workspace.id,
          userId: clerkUserId,
          audioBuffer,
          mimeType,
          meta: {
            source: 'workspaces-ai-transcribe-api',
            fileName,
            mimeType,
          },
        });
      },
    });

    return apiSuccess(
      {
        transcriptText: out.text || '',
        provider: out.provider,
        model: out.model,
        chargedCents: out.chargedCents,
      },
      { headers: abuse.headers }
    );
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const errName = e instanceof Error ? e.constructor.name || e.name : 'unknown';
    console.error('[ai/transcribe] Error:', { name: errName, message: errMsg });

    if (e instanceof APIError) {
      return apiError(e, { status: e.status, message: e.message || userFriendlyError(e) });
    }
    return apiError(e, { status: 500, message: userFriendlyError(e) });
  }
}

export const POST = shabbatGuard(POSTHandler);
