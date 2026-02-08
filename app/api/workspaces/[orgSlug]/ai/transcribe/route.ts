import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { logAuditEvent } from '@/lib/audit';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

async function POSTHandler(req: Request, { params }: { params: { orgSlug: string } }) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const { orgSlug } = params;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params });

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

    const mimeType = String(file.type || 'application/octet-stream');
    const fileName = String(file.name || 'recording');

    await logAuditEvent('ai.query', 'workspaces.transcription', {
      details: {
        orgSlug,
        organizationId: workspace.id,
        fileName,
        mimeType,
      },
    });

    const audioBuffer = await file.arrayBuffer();

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
    if (e instanceof APIError) {
      return apiError(e.message || 'Forbidden', { status: e.status });
    }
    return apiError(e, { message: 'Failed to transcribe' });
  }
}

export const POST = shabbatGuard(POSTHandler);
