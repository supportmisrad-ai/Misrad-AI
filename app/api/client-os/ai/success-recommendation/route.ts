import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard } from '@/lib/server/aiAbuseGuard';
import { asObject } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await getWorkspaceOrThrow(req);

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: 'ai.client_os.ai.success_recommendation',
      organizationId: workspaceId,
      userId: clerkUserId,
      limits: {
        ipMin: { limit: 30, windowMs: 60_000, label: 'ip-min' },
        userMin: { limit: 25, windowMs: 60_000, label: 'user-min' },
      },
    });
    if (!abuse.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: abuse.headers });
    }

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};
    const clientName = String(bodyObj.clientName || '').trim();
    const healthScore = Number(bodyObj.healthScore || 0);

    if (!clientName) return NextResponse.json({ error: 'clientName is required' }, { status: 400 });

    const prompt = `As a high-end agency consultant, provide a tip in Hebrew for the business owner on how to use transparency to retain client "${clientName}". Health Score is ${healthScore}/100. Tip should be motivating and professional (max 15 words). JSON: {tip, expectedBenefit}`;

    const ai = AIService.getInstance();
    const out = await ai.generateJson<{ tip?: string; expectedBenefit?: string }>({
      featureKey: 'client_os.ai.success_recommendation',
      prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tip: { type: Type.STRING },
          expectedBenefit: { type: Type.STRING },
        },
      },
    });

    const parsed = out.result || {};
    return NextResponse.json(
      {
        tip: parsed.tip || 'שקיפות מלאה במדדי הצלחה מחזקת את האמון בטווח הארוך.',
        expectedBenefit: parsed.expectedBenefit || 'שיפור בשימור לקוח (Retention)',
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
              : 'Forbidden';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : e.message || safeMsg },
        { status: e.status }
      );
    }
    return NextResponse.json(
      {
        tip: 'שקיפות מלאה במדדי הצלחה מחזקת את האמון בטווח הארוך.',
        expectedBenefit: 'שיפור בשימור לקוח (Retention)',
      },
      { status: 200 }
    );
  }
}

export const POST = shabbatGuard(POSTHandler);
