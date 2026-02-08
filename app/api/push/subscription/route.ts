import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { deleteWebPushSubscriptions, upsertWebPushSubscription } from '@/lib/server/web-push';

import { asObject } from '@/lib/shared/unknown';
function getString(obj: Record<string, unknown> | null, key: string): string {
  const v = obj?.[key];
  return typeof v === 'string' ? v : String(v ?? '');
}

function getNullableString(obj: Record<string, unknown> | null, key: string): string | null {
  const v = obj?.[key];
  if (v == null) return null;
  return typeof v === 'string' ? v : String(v);
}

async function POSTHandler(request: NextRequest) {
  try {
    const clerkUser = await getAuthenticatedUser();
    const { workspaceId } = await getWorkspaceOrThrow(request);

    const body: unknown = await request.json().catch(() => ({}));
    const bodyObj = asObject(body) ?? {};
    const subscriptionObj = asObject(bodyObj.subscription) ?? {};
    const keysObj = asObject(subscriptionObj.keys) ?? {};

    const endpoint = getString(subscriptionObj, 'endpoint');
    const p256dh = getString(keysObj, 'p256dh');
    const auth = getString(keysObj, 'auth');
    const expirationTimeRaw = subscriptionObj.expirationTime;
    const expirationTimeMs =
      typeof expirationTimeRaw === 'number' && Number.isFinite(expirationTimeRaw) ? expirationTimeRaw : null;

    const userAgent = getNullableString(bodyObj, 'userAgent');

    const email = String(clerkUser.email || '').trim().toLowerCase();
    if (!email) {
      return apiError('User email missing', { status: 400, message: 'חסר אימייל משתמש' });
    }

    await upsertWebPushSubscription({
      organizationId: workspaceId,
      clerkUserId: String(clerkUser.id),
      email,
      endpoint,
      p256dh,
      auth,
      expirationTime: expirationTimeMs ? new Date(expirationTimeMs) : null,
      userAgent,
    });

    return apiSuccess({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
    }
    return apiError(error, { status: 500, message: 'שגיאה בשמירת הרשמה להתראות' });
  }
}

async function DELETEHandler(request: NextRequest) {
  try {
    const clerkUser = await getAuthenticatedUser();
    const { workspaceId } = await getWorkspaceOrThrow(request);

    const body: unknown = await request.json().catch(() => ({}));
    const bodyObj = asObject(body) ?? {};
    const endpoint = getNullableString(bodyObj, 'endpoint');

    const count = await deleteWebPushSubscriptions({
      organizationId: workspaceId,
      clerkUserId: String(clerkUser.id),
      endpoint: endpoint || null,
    });

    return apiSuccess({ ok: true, deleted: count }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
    }
    return apiError(error, { status: 500, message: 'שגיאה בביטול הרשמה להתראות' });
  }
}

export const POST = shabbatGuard(POSTHandler);
export const DELETE = shabbatGuard(DELETEHandler);
