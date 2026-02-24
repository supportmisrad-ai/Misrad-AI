import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

async function GETHandler() {
  try {
    await requireSuperAdmin();

    const providers: Record<string, { configured: boolean; envVar: string }> = {
      google: {
        configured: Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
        envVar: process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : process.env.API_KEY ? 'API_KEY' : 'GEMINI_API_KEY',
      },
      openai: {
        configured: Boolean(process.env.OPENAI_API_KEY),
        envVar: 'OPENAI_API_KEY',
      },
      anthropic: {
        configured: Boolean(process.env.ANTHROPIC_API_KEY),
        envVar: 'ANTHROPIC_API_KEY',
      },
    };

    return apiSuccess({ providers });
  } catch (err: unknown) {
    return apiError(err instanceof Error ? err.message : 'שגיאה בבדיקת סטטוס ספקים', { status: 500 });
  }
}

export { GETHandler as GET };
