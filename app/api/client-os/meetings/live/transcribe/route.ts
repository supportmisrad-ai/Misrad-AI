import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';
export const maxDuration = 60;

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const form = await req.formData();

    const formOrgKey = typeof form.get('orgId') === 'string' ? String(form.get('orgId')) : '';
    let headerOrgKey = '';
    try {
      headerOrgKey = getOrgKeyOrThrow(req);
    } catch {
      headerOrgKey = '';
    }

    const bodyOrgKey = String(formOrgKey || '').trim();
    const orgKey = headerOrgKey || bodyOrgKey;

    if (!orgKey) return apiError('orgId is required', { status: 400 });

    const file = form.get('audio');
    if (!(file instanceof File)) {
      return apiError('audio file is required', { status: 400 });
    }

    const mimeTypeRaw = form.get('mimeType');
    const mimeType = String((typeof mimeTypeRaw === 'string' && mimeTypeRaw) || file.type || 'audio/webm');

    const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgKey);

    if (headerOrgKey && bodyOrgKey && headerOrgKey !== bodyOrgKey) {
      try {
        const otherKey = headerOrgKey === orgKey ? bodyOrgKey : headerOrgKey;
        const { workspace: otherWorkspace } = await getWorkspaceByOrgKeyOrThrow(otherKey);
        if (String(otherWorkspace.id) !== String(workspace.id)) {
          return apiError('Conflicting workspace context', { status: 400 });
        }
      } catch {
        return apiError('Conflicting workspace context', { status: 400 });
      }
    }

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: 'ai.client_os.meetings.live_transcribe',
      organizationId: workspace.id,
      userId: clerkUserId,
      limits: {
        ipMin: { limit: 20, windowMs: 60_000, label: 'ip-min' },
        userMin: { limit: 15, windowMs: 60_000, label: 'user-min' },
      },
    });

    if (!abuse.ok) {
      return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
    }

    const arrayBuffer = await file.arrayBuffer();

    const out = await withAiLoadIsolation({
      namespace: 'ai.transcribe',
      organizationId: workspace.id,
      task: async () => {
        const ai = AIService.getInstance();
        return await ai.transcribe({
          featureKey: 'client_os.meetings.live_transcribe',
          organizationId: workspace.id,
          userId: clerkUserId,
          audioBuffer: arrayBuffer,
          mimeType,
          meta: {
            source: 'client-os-live',
            fileName: file.name || null,
            size: file.size,
          },
        });
      },
    });

    return apiSuccessCompat({ text: out.text }, { headers: abuse.headers });
  } catch (e: unknown) {
    const errMsg = getErrorMessage(e) || String(e);
    console.error('[live-transcribe] Error:', errMsg);

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

    const lower = errMsg.toLowerCase();
    if (lower.includes('missing api key') || lower.includes('missing provider')) {
      console.error('[live-transcribe] AI provider not configured. Set GEMINI_API_KEY in environment.');
      return apiError(e, { status: 503, message: 'AI transcription service not configured' });
    }
    if (lower.includes('overloaded') || lower.includes('overload')) {
      return apiError(e, { status: 503, message: 'Service temporarily overloaded' });
    }
    if (lower.includes('upgrade') || lower.includes('insufficient')) {
      return apiError(e, { status: 402, message: 'Upgrade required' });
    }

    const safeMsg = 'Live transcription failed';
    return apiError(e, { status: 500, message: IS_PROD ? safeMsg : errMsg || safeMsg });
  }
}

export const POST = shabbatGuard(POSTHandler);
