import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { logAuditEvent } from '@/lib/audit';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

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

    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return apiError('file is required', { status: 400 });
    }

    const mimeType = String(file.type || 'application/octet-stream');
    const fileName = String(file.name || 'recording');

    await logAuditEvent('ai.query', 'system.calls.transcription', {
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
          featureKey: 'system.calls.transcription',
          organizationId: workspace.id,
          userId: clerkUserId,
          audioBuffer,
          mimeType,
          meta: {
            module: 'system',
            source: 'call-analyzer',
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
    return apiError(e, { message: 'Failed to transcribe' });
  }
}

export const POST = shabbatGuard(POSTHandler);
