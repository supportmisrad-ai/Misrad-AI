import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import prisma from '@/lib/prisma';

async function POSTHandler(request: NextRequest) {
  try {
    const pairingSecret = process.env.KIOSK_PAIRING_SECRET;
    if (!pairingSecret && process.env.NODE_ENV === 'production') {
      return apiError('Kiosk pairing is not configured', { status: 500 });
    }
    if (pairingSecret) {
      const header = request.headers.get('x-kiosk-secret');
      if (header !== pairingSecret) {
        return apiError('Unauthorized', { status: 401 });
      }
    }

    const approvingUser = await getAuthenticatedUser();
    const approvingClerkUserId = String(approvingUser.id);

    const { workspace } = await getWorkspaceOrThrow(request);
    await requirePermission('manage_team');

    const bodyJson: unknown = await request.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};
    const code = String(bodyObj.code || '').trim().toUpperCase();
    const approvedForUserId = String(bodyObj.approvedForUserId || '').trim();

    if (!code || !approvedForUserId) {
      return apiError('Missing code/approvedForUserId', { status: 400 });
    }

    const tokenRow = await prisma.devicePairingToken.findFirst({
      where: { code: String(code), organizationId: String(workspace.id) },
    });

  if (!tokenRow?.id) {
    return apiError('קוד לא נמצא', { status: 404 });
  }

  const now = new Date();
  const expiresAt = tokenRow.expiresAt ? new Date(String(tokenRow.expiresAt)) : null;
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return apiError('הקוד פג תוקף', { status: 400 });
  }

  const status = String(tokenRow.status || '').toUpperCase();
  if (status !== 'PENDING') {
    return apiError('הקוד כבר טופל', { status: 400 });
  }

  const approvedForUser = await prisma.nexusUser.findFirst({
    where: { id: String(approvedForUserId), organizationId: String(workspace.id) },
    select: { id: true, email: true, organizationId: true },
  });

  const email = String(approvedForUser?.email || '').trim();
  if (!email) {
    return apiError('לא נמצא אימייל למשתמש', { status: 400 });
  }

  const clerk = await clerkClient();
  const clerkUsers = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  const targetClerkUserId = clerkUsers?.data?.[0]?.id ? String(clerkUsers.data[0].id) : null;

  if (!targetClerkUserId) {
    return apiError('המשתמש לא נמצא ב-Clerk', { status: 400 });
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return apiError('Clerk secret key not configured', { status: 500 });
  }

  const createTokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: targetClerkUserId,
      expires_in_seconds: 300,
    }),
  });

  if (!createTokenRes.ok) {
    return apiError('שגיאה ביצירת sign-in token', { status: 500 });
  }

  const createdJson: unknown = await createTokenRes.json().catch(() => null);
  const createdObj = asObject(createdJson);
  const signInToken = typeof createdObj?.token === 'string' ? String(createdObj.token) : null;

  if (!signInToken) {
    return apiError('שגיאה ביצירת sign-in token', { status: 500 });
  }

  await prisma.devicePairingToken.update({
    where: { id: String(tokenRow.id) },
    data: {
      status: 'APPROVED',
      organizationId: String(workspace.id),
      approvedByUserId: String(approvingClerkUserId),
      approvedForUserId: String(approvedForUserId),
      approvedForClerkId: String(targetClerkUserId),
      signInToken: String(signInToken),
      approvedAt: now,
    },
  });

    return apiSuccess({});
  } catch (e: unknown) {
    if (e instanceof APIError) {
      return apiError(e, { status: e.status, message: e.message || 'Forbidden' });
    }
    return apiError(e, { status: 500, message: getErrorMessage(e) || 'Internal server error' });
  }
}

export const POST = shabbatGuard(POSTHandler);
