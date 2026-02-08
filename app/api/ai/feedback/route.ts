import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getErrorMessage } from '@/lib/shared/unknown';

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

    // שמירת feedback למסד הנתונים
    // כרגע רק לוג - אפשר להוסיף פריזמה אחר כך
    if (!IS_PROD) {
      console.log('[AI Feedback]', {
        sessionId,
        rating,
        helpful,
        feedback: feedback?.substring(0, 100),
        timestamp: new Date().toISOString(),
      });
    }

    // TODO: שמירה בפועל למסד נתונים
    // await prisma.$executeRaw`
    //   UPDATE ai_chat_sessions 
    //   SET user_rating = ${rating}, helpful_yn = ${helpful}, user_feedback = ${feedback}
    //   WHERE session_id = ${sessionId}
    // `;

    return NextResponse.json({ 
      success: true,
      message: 'תודה על המשוב! 💚'
    });
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
