import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await getAuthenticatedUser();

    const body = (await req.json().catch(() => ({}))) as { clientName?: string; healthScore?: number };
    const clientName = String(body.clientName || '').trim();
    const healthScore = Number(body.healthScore || 0);

    if (!clientName) return NextResponse.json({ error: 'clientName is required' }, { status: 400 });

    const apiKey = process.env.API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API_KEY env var' }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });

    const model = 'gemini-3-flash-preview';
    const prompt = `As a high-end agency consultant, provide a tip in Hebrew for the business owner on how to use transparency to retain client "${clientName}". Health Score is ${healthScore}/100. Tip should be motivating and professional (max 15 words). JSON: {tip, expectedBenefit}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tip: { type: Type.STRING },
            expectedBenefit: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
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
