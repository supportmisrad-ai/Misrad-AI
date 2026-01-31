import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard } from '@/lib/server/aiAbuseGuard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

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

    const body = (await req.json().catch(() => ({}))) as { clientName?: string; healthScore?: number };
    const clientName = String(body.clientName || '').trim();
    const healthScore = Number(body.healthScore || 0);

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
  } catch (e: any) {
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
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
