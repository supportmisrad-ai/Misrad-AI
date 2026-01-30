import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { logAuditEvent } from '@/lib/audit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

type SuggestRequestBody = {
  transcriptText?: string;
};

async function POSTHandler(req: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const { orgSlug } = await params;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params });

    const body = (await req.json().catch(() => ({}))) as SuggestRequestBody;
    const transcriptText = String(body.transcriptText || '').trim();

    if (!transcriptText) {
      return apiError('transcriptText is required', { status: 400 });
    }

    await logAuditEvent('ai.query', 'system.calls.objection_suggestions', {
      details: {
        orgSlug,
        organizationId: workspace.id,
        transcriptChars: transcriptText.length,
      },
    });

    const prompt = `אתה מאמן מכירות ושירות ברמה גבוהה.
קיבלת תמלול שיחה (עברית) של שיחת מכירה/שירות.

החזר JSON תקין בלבד (ללא טקסט חופשי).

מטרות:
1) סכם את השיחה בקצרה.
2) תן ציון שיחה 0-100.
3) זהה כוונת לקוח.
4) הפק 3-7 הצעות "מענה להתנגדות" (objection -> reply -> next_question).
5) הפק רשימת משימות אופרטיביות.
6) אם אפשר - החזר גם פירוק בסיסי לקטעי תמלול (speaker,timestamp,text,sentiment).

חשוב: לגבי תזכורות ומועדים - אתה רשאי רק להציע מועד (dueAtSuggestion). אל תקבע מועד מחייב. המשתמש יאשר במערכת.
אם אין מספיק מידע לשעה/תאריך - החזר null ב-dueAtSuggestion.

תמלול:
${transcriptText.slice(0, 24000)}

פורמט ה-JSON:
{
  "summary": "...",
  "score": 0,
  "intent": "buying"|"window_shopping"|"angry"|"churn_risk",
  "objections": [{"objection":"...","reply":"...","next_question":"..."}],
  "topics": {"promises":[],"painPoints":[],"likes":[],"slang":[],"stories":[],"decisions":[],"tasks":[{"title":"...","dueAtSuggestion":null,"dueAtConfidence":0,"dueAtRationale":"..."}]},
  "feedback": {"positive":[],"improvements":[]},
  "transcript": [{"speaker":"Agent"|"Customer","timestamp":0,"text":"...","sentiment":"positive"|"negative"|"neutral"}]
}`;

    const ai = AIService.getInstance();
    const out = await ai.generateJson({
      featureKey: 'system.calls.objection_suggestions',
      organizationId: workspace.id,
      userId: clerkUserId,
      prompt,
      meta: {
        module: 'system',
        source: 'call-analyzer',
        transcriptChars: transcriptText.length,
      },
    });

    return apiSuccess({
      result: out.result,
      provider: out.provider,
      model: out.model,
      chargedCents: out.chargedCents,
    });
  } catch (e: any) {
    if (e instanceof APIError) {
      return apiError(e.message || 'Forbidden', { status: e.status });
    }
    return apiError(e, { message: 'Failed to suggest replies' });
  }
}

export const POST = shabbatGuard(POSTHandler);
