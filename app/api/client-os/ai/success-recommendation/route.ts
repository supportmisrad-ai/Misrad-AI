import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getAuthenticatedUser } from '@/lib/auth';
import { AIService } from '@/lib/services/ai/AIService';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

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
    return NextResponse.json({
      tip: parsed.tip || 'שקיפות מלאה במדדי הצלחה מחזקת את האמון בטווח הארוך.',
      expectedBenefit: parsed.expectedBenefit || 'שיפור בשימור לקוח (Retention)',
    });
  } catch (e: any) {
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
