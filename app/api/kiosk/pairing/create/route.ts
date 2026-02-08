import { NextRequest } from 'next/server';
import { randomBytes, randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { asObject } from '@/lib/server/workspace-access/utils';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

export const runtime = 'nodejs';

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

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  const bodyJson: unknown = await request.json().catch(() => ({}));
  const bodyObj = asObject(bodyJson) ?? {};
  const deviceNonce = String(bodyObj.deviceNonce || '').trim() || randomUUID();

  const existing = await prisma.devicePairingToken.findUnique({
    where: { deviceNonce },
    select: { id: true, code: true, status: true, expiresAt: true },
  });

  if (existing?.id) {
    const existingStatus = String(existing.status || '').toUpperCase();
    const existingExpiresAt = existing.expiresAt ? new Date(existing.expiresAt) : null;
    const isStillValid =
      existingStatus === 'PENDING' && existingExpiresAt && existingExpiresAt.getTime() > now.getTime();

    if (isStillValid) {
      return apiSuccess({
        code: String(existing.code || '').toUpperCase(),
        deviceNonce,
        expiresAt: existingExpiresAt!.toISOString(),
      });
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateCode();

      try {
        const updated = await prisma.devicePairingToken.update({
          where: { id: String(existing.id) },
          data: {
            code,
            status: 'PENDING',
            expiresAt,
            organizationId: null,
            approvedByUserId: null,
            approvedForUserId: null,
            approvedForClerkId: null,
            signInToken: null,
            approvedAt: null,
            consumedAt: null,
            token: null,
            used: false,
          },
          select: { code: true, deviceNonce: true, expiresAt: true },
        });

        return apiSuccess({
          code: String(updated.code || '').toUpperCase(),
          deviceNonce: String(updated.deviceNonce || ''),
          expiresAt: updated.expiresAt ? new Date(updated.expiresAt).toISOString() : expiresAt.toISOString(),
        });
      } catch (e: unknown) {
        const errObj = asObject(e) ?? {};
        if (String(errObj.code || '') === 'P2002') {
          continue;
        }
        return apiError('שגיאה ביצירת קוד', { status: 500 });
      }
    }

    return apiError('שגיאה ביצירת קוד', { status: 500 });
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();

    try {
      const created = await prisma.devicePairingToken.create({
        data: {
          code,
          deviceNonce,
          status: 'PENDING',
          expiresAt,
        },
        select: { code: true, deviceNonce: true, expiresAt: true },
      });

      return apiSuccess({
        code: String(created.code || '').toUpperCase(),
        deviceNonce: String(created.deviceNonce || ''),
        expiresAt: created.expiresAt ? new Date(created.expiresAt).toISOString() : expiresAt.toISOString(),
      });
    } catch (e: unknown) {
      const errObj = asObject(e) ?? {};
      if (String(errObj.code || '') === 'P2002') {
        continue;
      }
      return apiError('שגיאה ביצירת קוד', { status: 500 });
    }
  }

  return apiError('שגיאה ביצירת קוד', { status: 500 });
}

export const POST = shabbatGuard(POSTHandler);
