import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getWebPushPublicKey } from '@/lib/server/web-push';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(request: NextRequest) {
  try {
    await getAuthenticatedUser();
    await getWorkspaceOrThrow(request);

    const publicKey = getWebPushPublicKey();
    return apiSuccess({ publicKey }, { status: 200 });
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
    return apiError(error, { status: 500, message: 'שגיאה בטעינת מפתח Push' });
  }
}

export const GET = shabbatGuard(GETHandler);
