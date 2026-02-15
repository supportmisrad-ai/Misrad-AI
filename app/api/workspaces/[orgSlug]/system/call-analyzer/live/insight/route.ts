import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

type LiveInsightRequestBody = {
  transcriptText?: string;
};

function asString(value: unknown): string {
  return value == null ? '' : String(value);
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
      namespace: 'ai.system.call_analyzer.live_insight',
      organizationId: workspace.id,
      userId: clerkUserId,
    });
    if (!abuse.ok) {
      return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
    }

    const body = (await req.json().catch(() => ({}))) as LiveInsightRequestBody;
    const transcriptText = asString(body.transcriptText).trim();

    if (!transcriptText) {
      return apiSuccess({ insight: 'ממתין לתחילת השיחה...' }, { headers: abuse.headers });
    }

    const truncated = transcriptText.length > 6000 ? transcriptText.slice(-6000) : transcriptText;

    const prompt = `אתה מאמן מכירות בזמן אמת (Live Coach).
קיבלת תמלול חלקי של שיחת מכירה/שירות בעברית.
החזר JSON תקין בלבד ללא טקסט חופשי, בפורמט:
{ "insight": "..." }

כללים:
- תן תובנה אחת קצרה, עד 15 מילים.
- תן משהו שאפשר להגיד עכשיו / שאלה הבאה / זיהוי סיכון.

תמלול (חלקי):
${truncated}`;

    const out = await withAiLoadIsolation({
      namespace: 'ai.generate_json',
      organizationId: workspace.id,
      task: async () => {
        const ai = AIService.getInstance();
        return await ai.generateJson<{ insight?: string }>({
          featureKey: 'system.calls.live_insight',
          organizationId: workspace.id,
          userId: clerkUserId,
          prompt,
          meta: {
            module: 'system',
            source: 'call-analyzer-live',
            transcriptChars: transcriptText.length,
          },
        });
      },
    });

    const insight = asString(out.result?.insight).trim() || 'המשך להקשיב, עדיין אין מספיק הקשר.';

    return apiSuccess(
      {
        insight,
        provider: out.provider,
        model: out.model,
        chargedCents: out.chargedCents,
      },
      { headers: abuse.headers }
    );
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
    return apiError(e, { message: 'Failed to generate live insight' });
  }
}

export const POST = shabbatGuard(POSTHandler);
