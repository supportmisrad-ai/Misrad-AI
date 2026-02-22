import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getErrorMessage } from '@/lib/shared/unknown';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

export const runtime = 'nodejs';

type FeedbackBody = {
  sessionId: string;
  rating?: number;
  helpful?: boolean;
  feedback?: string;
};

export async function POST(req: Request) {
  try {
    await getAuthenticatedUser();

    const body: FeedbackBody = await req.json();
    
    const { sessionId, rating, helpful, feedback } = body;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    return await withTenantIsolationContext(
      { source: 'api_ai_feedback', reason: 'save_ai_feedback', suppressReporting: true },
      async () => {
        if (!IS_PROD) {
          console.log('[AI Feedback]', {
            sessionId,
            rating,
            helpful,
            feedback: feedback?.substring(0, 100),
            timestamp: new Date().toISOString(),
          });
        }

        try {
          const { executeRawOrgScoped } = await import('@/lib/prisma');
          const prisma = (await import('@/lib/prisma')).default;
          const { getCurrentUserId } = await import('@/lib/server/authHelper');

          const clerkUserId = await getCurrentUserId();
          if (clerkUserId) {
            const member = await prisma.organizationUser.findUnique({
              where: { clerk_user_id: String(clerkUserId) },
              select: { organization_id: true },
            });
            const orgId = member?.organization_id ? String(member.organization_id) : null;

            if (orgId) {
              await executeRawOrgScoped(prisma, {
                organizationId: orgId,
                reason: 'ai_feedback_save',
                query: `
                  UPDATE ai_chat_sessions
                  SET user_rating = $2,
                      helpful_yn = $3,
                      user_feedback = $4,
                      updated_at = NOW()
                  WHERE session_id = $1
                    AND organization_id = $5
                `,
                values: [
                  sessionId,
                  rating ?? null,
                  helpful ?? null,
                  feedback ? feedback.substring(0, 2000) : null,
                  orgId,
                ],
              });
            }
          }
        } catch (saveErr) {
          if (!IS_PROD) console.warn('[AI Feedback] DB save failed (non-fatal):', saveErr);
        }

        return NextResponse.json({ 
          success: true,
          message: 'תודה על המשוב!'
        });
      }
    );
  } catch (error) {
    const msg = getErrorMessage(error);
    if (IS_PROD) console.error('[AI Feedback Error]');
    else console.error('[AI Feedback Error]', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}
