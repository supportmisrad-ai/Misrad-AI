import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { sendWebPushNotificationToEmails } from '@/lib/server/web-push';

import { asObject } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

function getString(obj: Record<string, unknown> | null, key: string, fallback = ''): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

async function POSTHandler(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { workspaceId } = await getWorkspaceOrThrow(request);

    const body: unknown = await request.json().catch(() => ({}));
    const obj = asObject(body);

    const email = String(user.email || '').trim().toLowerCase();
    if (!email) {
      return apiError('User email missing', { status: 400, message: 'חסר אימייל משתמש' });
    }

    const title = getString(obj, 'title', 'Misrad AI');
    const message = getString(obj, 'body', 'בדיקת Push');
    const url = getString(obj, 'url', '/');
    const tag = getString(obj, 'tag', 'misrad-push-test');

    const result = await sendWebPushNotificationToEmails({
      organizationId: workspaceId,
      emails: [email],
      payload: {
        title,
        body: message,
        url,
        tag,
        category: 'system',
      },
    });

    return apiSuccess({ ok: true, ...result }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      const safeMsg =
        error.status === 400
          ? 'Bad request'
          : error.status === 401
            ? 'Unauthorized'
            : error.status === 404
              ? 'Not found'
              : error.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return apiError(error, {
        status: error.status,
        message: IS_PROD ? safeMsg : error.message || safeMsg,
      });
    }
    return apiError(error, { status: 500, message: 'שגיאה בשליחת Push (בדיקה)' });
  }
}

export const POST = shabbatGuard(POSTHandler);
