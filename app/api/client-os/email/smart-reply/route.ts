import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await getAuthenticatedUser();

    const apiKey = process.env.API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API_KEY env var' }, { status: 500 });

    const body = (await req.json()) as {
      emailBody?: string;
      senderName?: string;
      tone?: string;
    };

    const emailBody = String(body.emailBody || '');
    const senderName = String(body.senderName || '');
    const tone = String(body.tone || 'professional');

    if (!emailBody.trim()) return NextResponse.json({ error: 'emailBody is required' }, { status: 400 });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview';

    const prompt = `Reply to this email in Hebrew. From: ${senderName || 'הלקוח'}. Body: ${emailBody}. Tone: ${tone}. Brief and helpful.`;
    const response = await ai.models.generateContent({ model, contents: prompt });

    return NextResponse.json({ draft: response.text || '' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to generate reply' }, { status: 500 });
  }
}
