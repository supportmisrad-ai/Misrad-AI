import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser, hasPermission } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

const IS_PROD = process.env.NODE_ENV === 'production';

async function POSTHandler(request: NextRequest) {
  try {
    await getAuthenticatedUser();

    const allowed =
      (await hasPermission('manage_team')) || (await hasPermission('view_financials')) || (await hasPermission('manage_system'));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const safeMsg = 'שגיאה כללית';
      return NextResponse.json({ error: IS_PROD ? safeMsg : 'חסר OPENAI_API_KEY' }, { status: 500 });
    }

    const formData = await request.formData();
    const imageValue = formData.get('image');
    const file = imageValue instanceof File ? imageValue : null;
    const promptRaw = formData.get('prompt');
    const prompt = promptRaw ? String(promptRaw) : "תאר בקצרה ובדיוק מה מופיע בתמונה, כדי שאוכל למלא שדה 'תיאור פריט'.";

    if (!file) {
      return NextResponse.json({ error: 'חסר קובץ image' }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const base64 = Buffer.from(ab).toString('base64');
    const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              "ענה תמיד בעברית. תהיה ישיר ומעשי. החזר תיאור קצר (שורה-שתיים) שמתאים לשדה 'תיאור פריט'. אל תוסיף מבוא, אל תוסיף כותרות.",
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const safeMsg = 'שגיאה כללית';
      const msg = `OpenAI error (${res.status}): ${txt}`;
      return NextResponse.json({ error: IS_PROD ? safeMsg : msg }, { status: 502 });
    }

    const json: unknown = await res.json().catch(() => null);
    const jsonObj = asObject(json) ?? {};
    const choices = Array.isArray(jsonObj.choices) ? jsonObj.choices : [];
    const firstChoice = choices.length > 0 ? asObject(choices[0]) : null;
    const messageObj = asObject(firstChoice?.message);
    const content = messageObj?.content;
    const description = typeof content === 'string' ? content : '';

    if (!description) {
      return NextResponse.json({ error: 'תשובת AI ריקה' }, { status: 502 });
    }

    return NextResponse.json({ success: true, description });
  } catch (e: unknown) {
    if (IS_PROD) console.error('[operations.ai.vision] failed');
    else console.error('[operations.ai.vision] failed', e);
    const safeMsg = 'שגיאה כללית';
    return NextResponse.json({ error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
