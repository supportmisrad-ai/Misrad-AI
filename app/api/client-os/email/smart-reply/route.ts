import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard } from '@/lib/server/aiAbuseGuard';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

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
      namespace: 'ai.client_os.email.smart_reply',
      organizationId: workspaceId,
      userId: clerkUserId,
    });
    if (!abuse.ok) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: abuse.headers });
    }

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};

    const emailBody = String(bodyObj.emailBody || '');
    const senderName = String(bodyObj.senderName || '');
    const tone = String(bodyObj.tone || 'professional');

    if (!emailBody.trim()) return NextResponse.json({ error: 'emailBody is required' }, { status: 400 });

    const prompt = `Reply to this email in Hebrew. From: ${senderName || 'הלקוח'}. Body: ${emailBody}. Tone: ${tone}. Brief and helpful.`;

    const ai = AIService.getInstance();
    const out = await ai.generateText({
      featureKey: 'client_os.email.smart_reply',
      prompt,
      meta: { tone },
    });

    return NextResponse.json({ draft: out.text || '' }, { headers: abuse.headers });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg =
        e.status === 400
          ? 'Bad request'
          : e.status === 401
            ? 'Unauthorized'
            : e.status === 404
              ? 'Not found'
              : e.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : e.message || safeMsg },
        { status: e.status }
      );
    }
    const safeMsg = 'Failed to generate reply';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
      { status: 500 }
    );
  }
}

export const POST = shabbatGuard(POSTHandler);
