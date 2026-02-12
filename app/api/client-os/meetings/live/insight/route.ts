import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { Type } from '@google/genai';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

function asString(value: unknown): string {
  return value == null ? '' : String(value);
}

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { orgId?: string; transcript?: string };

    const bodyOrgKey = asString(body.orgId).trim();
    let headerOrgKey = '';
    try {
      headerOrgKey = getOrgKeyOrThrow(req);
    } catch {
      headerOrgKey = '';
    }
    const orgKey = headerOrgKey || bodyOrgKey;

    const transcript = asString(body.transcript).trim();

    if (!orgKey) return apiError('orgId is required', { status: 400 });
    if (!transcript) return apiSuccessCompat({ insight: 'ממתין לתחילת השיחה...' });

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
      namespace: 'ai.client_os.meetings.live_insight',
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

    const ai = AIService.getInstance();

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        insight: { type: Type.STRING },
      },
      required: ['insight'],
    };

    const truncated = transcript.length > 4000 ? transcript.slice(-4000) : transcript;

    const aiOut = await withAiLoadIsolation({
      namespace: 'ai.generate_json',
      organizationId: workspace.id,
      task: async () => {
        return await ai.generateJson<{ insight: string }>({
          featureKey: 'client_os.meetings.live_insight',
          organizationId: workspace.id,
          userId: clerkUserId,
          prompt: truncated,
          systemInstruction: `אתה מאמן שיחה (Live Coach) לפגישות B2B.
תן תובנה אחת קצרה, בעברית, עד 15 מילים.
התמקדות: מה לומר עכשיו / שאלה הבאה / סיכון.
החזר JSON בלבד.`,
          responseSchema,
        });
      },
    });

    const insight = asString(aiOut.result?.insight).trim() || 'המשך להקשיב, עדיין אין מספיק הקשר.';
    return apiSuccessCompat({ insight }, { headers: abuse.headers });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg =
        e.status === 400
          ? 'Bad request'
          : e.status === 401
            ? 'Unauthorized'
            : e.status === 404
              ? 'Not found'
              : 'Forbidden';
      return apiError(e, { status: e.status, message: IS_PROD ? safeMsg : e.message || safeMsg });
    }
    const safeMsg = 'Live insight failed';
    return apiError(e, { status: 500, message: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg });
  }
}

export const POST = shabbatGuard(POSTHandler);
