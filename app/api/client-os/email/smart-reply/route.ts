import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { AIService } from '@/lib/services/ai/AIService';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const body = (await req.json()) as {
      emailBody?: string;
      senderName?: string;
      tone?: string;
    };

    const emailBody = String(body.emailBody || '');
    const senderName = String(body.senderName || '');
    const tone = String(body.tone || 'professional');

    if (!emailBody.trim()) return NextResponse.json({ error: 'emailBody is required' }, { status: 400 });

    const prompt = `Reply to this email in Hebrew. From: ${senderName || 'הלקוח'}. Body: ${emailBody}. Tone: ${tone}. Brief and helpful.`;

    const ai = AIService.getInstance();
    const out = await ai.generateText({
      featureKey: 'client_os.email.smart_reply',
      prompt,
      meta: { tone },
    });

    return NextResponse.json({ draft: out.text || '' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to generate reply' }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
