import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { asObject } from '@/lib/server/workspace-access/utils';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

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

  const bodyJson: unknown = await request.json().catch(() => ({}));
  const bodyObj = asObject(bodyJson) ?? {};
  const code = String(bodyObj.code || '').trim().toUpperCase();
  const deviceNonce = String(bodyObj.deviceNonce || '').trim();

  if (!code || !deviceNonce) {
    return apiError('Missing code/deviceNonce', { status: 400 });
  }

  let row: Awaited<ReturnType<typeof prisma.devicePairingToken.findFirst>> | null = null;
  try {
    row = await prisma.devicePairingToken.findFirst({
      where: { code: String(code), deviceNonce: String(deviceNonce) },
    });
  } catch {
    return apiError('שגיאה בטעינת סטטוס', { status: 500 });
  }

  if (!row?.id) {
    return apiSuccess({ status: 'NOT_FOUND' });
  }

  const now = new Date();
  const expiresAt = row.expiresAt ? new Date(row.expiresAt) : null;
  const isExpired = expiresAt ? expiresAt.getTime() <= now.getTime() : false;

  if (isExpired && String(row.status || '').toUpperCase() === 'PENDING') {
    await prisma.devicePairingToken.update({
      where: { id: String(row.id) },
      data: { status: 'EXPIRED' },
    });

    return apiSuccess({ status: 'EXPIRED' });
  }

  const status = String(row.status || '').toUpperCase();

  if (status === 'APPROVED' && row.signInToken && !row.consumedAt) {
    await prisma.devicePairingToken.update({
      where: { id: String(row.id) },
      data: { status: 'CONSUMED', consumedAt: now },
    });

    return apiSuccess({
      status: 'APPROVED',
      signInToken: String(row.signInToken),
      organizationId: row.organizationId ? String(row.organizationId) : null,
    });
  }

  return apiSuccess({
    status,
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
  });
}

export const POST = shabbatGuard(POSTHandler);
