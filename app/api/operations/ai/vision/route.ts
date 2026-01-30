import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser, hasPermission } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

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
      return NextResponse.json({ error: 'חסר OPENAI_API_KEY' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
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
      return NextResponse.json({ error: `OpenAI error (${res.status}): ${txt}` }, { status: 502 });
    }

    const json: any = await res.json();
    const description = json?.choices?.[0]?.message?.content ? String(json.choices[0].message.content) : '';

    if (!description) {
      return NextResponse.json({ error: 'תשובת AI ריקה' }, { status: 502 });
    }

    return NextResponse.json({ success: true, description });
  } catch (e: any) {
    console.error('[operations.ai.vision] failed', e);
    return NextResponse.json({ error: e?.message || 'שגיאה כללית' }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
