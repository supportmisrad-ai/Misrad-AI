import { NextResponse } from 'next/server';
import { AIService } from '@/lib/services/ai/AIService';
import { getAuthenticatedUser } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getErrorMessage } from '@/lib/shared/unknown';

export const runtime = 'nodejs';
export const maxDuration = 20;

const SYSTEM_PROMPT = `אתה עוזר AI מקצועי לשכתוב תסריטי מכירה ותקשורת עסקית בעברית.

כללים:
- שמור על הטון המקצועי אך חם ואישי
- השתמש בעברית טבעית ודוגרית - לא מליצית
- שמור על המבנה המקורי (שלבים, סעיפים) אלא אם ביקשו אחרת
- השאר placeholders בסוגריים מרובעים [כמו זה] - הם מכוונים
- אל תוסיף אימוג'ים אלא אם היו במקור
- אל תוסיף הסברים או הערות - רק את הטקסט המשוכתב`;

async function POSTHandler(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
    }

    const body = await req.json();
    const { scriptContent, instruction } = body as { scriptContent?: string; instruction?: string };

    if (!scriptContent || typeof scriptContent !== 'string' || scriptContent.length > 5000) {
      return NextResponse.json({ error: 'תוכן תסריט חסר או ארוך מדי' }, { status: 400 });
    }

    if (!instruction || typeof instruction !== 'string' || instruction.length > 500) {
      return NextResponse.json({ error: 'הוראה חסרה או ארוכה מדי' }, { status: 400 });
    }

    const prompt = `הנה תסריט מקורי:
---
${scriptContent}
---

הוראת שכתוב: ${instruction}

שכתב את התסריט לפי ההוראה. החזר רק את הטקסט המשוכתב, ללא הסברים.`;

    const ai = AIService.getInstance();
    const result = await ai.generateText({
      featureKey: 'script_rewrite',
      userId: user.id,
      prompt,
      systemInstruction: SYSTEM_PROMPT,
    });

    if (!result.text) {
      return NextResponse.json({ error: 'לא התקבלה תשובה מה-AI' }, { status: 500 });
    }

    return NextResponse.json({ rewritten: result.text });
  } catch (error: unknown) {
    console.error('[ai/rewrite-script] Error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || 'שגיאה בשכתוב התסריט' },
      { status: 500 }
    );
  }
}

export const POST = shabbatGuard(POSTHandler);
