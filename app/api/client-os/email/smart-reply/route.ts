import { NextResponse } from 'next/server';
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
      namespace: 'ai.client_os.email.smart_reply',
      organizationId: workspaceId,
      userId: clerkUserId,
    });
    if (!abuse.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: abuse.headers });
    }

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

    return NextResponse.json({ draft: out.text || '' }, { headers: abuse.headers });
  } catch (e: any) {
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message || 'Forbidden' }, { status: e.status });
    }
    return NextResponse.json({ error: e?.message ?? 'Failed to generate reply' }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
