import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { logAuditEvent } from '@/lib/audit';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import prisma from '@/lib/prisma';
import { asObject } from '@/lib/shared/unknown';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

type SuggestRequestBody = {
  transcriptText?: string;
};

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
      namespace: 'ai.system.call_analyzer.suggest',
      organizationId: workspace.id,
      userId: clerkUserId,
    });
    if (!abuse.ok) {
      return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
    }

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

    // Fetch business-specific AI sales context (non-blocking if missing)
    let businessContextBlock = '';
    try {
      const settings = await prisma.organization_settings.findUnique({
        where: { organization_id: String(workspace.id) },
        select: { ai_sales_context: true },
      });
      const ctx = asObject(settings?.ai_sales_context) ?? {};
      const parts: string[] = [];
      if (ctx.businessDescription) parts.push(`תיאור העסק: ${String(ctx.businessDescription)}`);
      if (ctx.productsAndServices) parts.push(`מוצרים ושירותים: ${String(ctx.productsAndServices)}`);
      if (ctx.targetAudience) parts.push(`קהל יעד: ${String(ctx.targetAudience)}`);
      if (ctx.salesApproach) parts.push(`סגנון מכירה: ${String(ctx.salesApproach)}`);
      if (ctx.salesScripts) parts.push(`תסריטי מכירה: ${String(ctx.salesScripts)}`);
      if (ctx.commonObjections) parts.push(`התנגדויות נפוצות ותשובות: ${String(ctx.commonObjections)}`);
      if (ctx.specialInstructions) parts.push(`הוראות מיוחדות: ${String(ctx.specialInstructions)}`);
      if (parts.length > 0) {
        businessContextBlock = `\n\nהקשר עסקי (השתמש במידע הזה כדי להתאים את הניתוח, הציונים, והמלצות המענה לעסק הספציפי הזה):\n${parts.join('\n')}`;
      }
    } catch {
      // non-fatal – proceed without business context
    }

    const prompt = `אתה מאמן מכירות ושירות ברמה גבוהה.
קיבלת תמלול שיחה (עברית) של שיחת מכירה/שירות.

החזר JSON תקין בלבד (ללא טקסט חופשי).${businessContextBlock}

מטרות:
1) סכם את השיחה בקצרה.
2) תן ציון שיחה 0-100 (אם יש הקשר עסקי – השווה לסטנדרט המכירה של העסק הזה).
3) זהה כוונת לקוח.
4) הפק 3-7 הצעות "מענה להתנגדות" (objection -> reply -> next_question). אם יש תסריטי מכירה או התנגדויות מוגדרות – השתמש בהם כבסיס.
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

    const out = await withAiLoadIsolation({
      namespace: 'ai.generate_json',
      organizationId: workspace.id,
      task: async () => {
        const ai = AIService.getInstance();
        return await ai.generateJson({
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
      },
    });

    return apiSuccess({
      result: out.result,
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
    return apiError(e, { message: 'Failed to suggest replies' });
  }
}

export const POST = shabbatGuard(POSTHandler);
