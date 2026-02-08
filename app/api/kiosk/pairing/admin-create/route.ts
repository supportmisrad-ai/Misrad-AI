import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

export const runtime = 'nodejs';

function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

function generateCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (chars: string, n: number) => {
    const b = randomBytes(n);
    let out = '';
    for (let i = 0; i < n; i++) {
      out += chars[b[i] % chars.length];
    }
    return out;
  };
  return `${pick(letters, 3)}-${pick(digits, 3)}`;
}

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

    const user = await getAuthenticatedUser();
    await requirePermission('manage_team');

    const { workspace } = await getWorkspaceOrThrow(request);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    for (let attempt = 0; attempt < 10; attempt++) {
      const token = generateToken();
      const code = generateCode();

      try {
        const created = await prisma.devicePairingToken.create({
          data: {
            code,
            token,
            deviceNonce: null,
            status: 'PENDING',
            expiresAt,
            organizationId: String(workspace.id),
            creatorClerkUserId: String(user.id),
            used: false,
          },
          select: { token: true, expiresAt: true },
        });

        if (created?.token) {
          return apiSuccess({
            token: String(created.token),
            expiresAt: created.expiresAt ? new Date(created.expiresAt).toISOString() : expiresAt.toISOString(),
          });
        }
      } catch (e: unknown) {
        const obj = asObject(e) ?? {};
        if (String(obj.code || '') === 'P2002') {
          continue;
        }
        return apiError('שגיאה ביצירת טוקן', { status: 500 });
      }
    }

    return apiError('שגיאה ביצירת טוקן', { status: 500 });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      return apiError(e, { status: e.status, message: e.message || 'Forbidden' });
    }
    return apiError(e, { status: 500, message: getErrorMessage(e) || 'Internal server error' });
  }
}

export const POST = shabbatGuard(POSTHandler);
