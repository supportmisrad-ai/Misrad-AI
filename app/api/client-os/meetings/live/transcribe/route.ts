import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const form = await req.formData();

    const orgIdInputRaw = form.get('orgId');
    let orgKey = typeof orgIdInputRaw === 'string' ? orgIdInputRaw : '';
    if (!orgKey) {
      try {
        orgKey = getOrgKeyOrThrow(req);
      } catch {
        orgKey = '';
      }
    }

    if (!orgKey) return apiError('orgId is required', { status: 400 });

    const file = form.get('audio');
    if (!(file instanceof File)) {
      return apiError('audio file is required', { status: 400 });
    }

    const mimeTypeRaw = form.get('mimeType');
    const mimeType = String((typeof mimeTypeRaw === 'string' && mimeTypeRaw) || file.type || 'audio/webm');

    const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgKey);

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
    if (e instanceof APIError) {
      return apiError(e.message || 'Forbidden', { status: e.status });
    }
    return apiError(e, { status: 500, message: getErrorMessage(e) || 'Live transcription failed' });
  }
}

export const POST = shabbatGuard(POSTHandler);
