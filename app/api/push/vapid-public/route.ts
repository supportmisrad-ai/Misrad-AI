import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getWebPushPublicKey } from '@/lib/server/web-push';

async function GETHandler(request: NextRequest) {
  try {
    await getAuthenticatedUser();
    await getWorkspaceOrThrow(request);

    const publicKey = getWebPushPublicKey();
    return apiSuccess({ publicKey }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
    }
    return apiError(error, { status: 500, message: 'שגיאה בטעינת מפתח Push' });
  }
}

export const GET = shabbatGuard(GETHandler);
