import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject } from '@/lib/server/workspace-access/utils';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

export const runtime = 'nodejs';

async function POSTHandler(request: NextRequest) {
  const pairingSecret = process.env.KIOSK_PAIRING_SECRET;
  if (!pairingSecret) {
    return NextResponse.json({ error: 'Kiosk pairing is not configured' }, { status: 500 });
  }
  const header = request.headers.get('x-kiosk-secret');
  if (header !== pairingSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bodyJson: unknown = await request.json().catch(() => ({}));
  const bodyObj = asObject(bodyJson) ?? {};
  const token = String(bodyObj.token || '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  return await withTenantIsolationContext(
    { source: 'api_auth_device_login', reason: 'device_login', suppressReporting: true },
    async () => {
  // First, read token to validate structure and expiration (but don't trust 'used' flag yet)
  let row: Awaited<ReturnType<typeof prisma.devicePairingToken.findUnique>> | null = null;
  try {
    row = await prisma.devicePairingToken.findUnique({
      where: { token: String(token) },
    });
  } catch {
    return NextResponse.json({ error: 'שגיאה בטעינת טוקן' }, { status: 500 });
  }

  if (!row?.id) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  const orgId = row.organizationId ? String(row.organizationId).trim() : '';
  if (!orgId) {
    return NextResponse.json({ error: 'Token misconfigured' }, { status: 500 });
  }

  const now = new Date();
  const expiresAt = row.expiresAt ? new Date(row.expiresAt) : null;
  const isExpired = expiresAt ? expiresAt.getTime() <= now.getTime() : false;

  if (isExpired) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 });
  }

  const creatorClerkUserId = row.creatorClerkUserId ? String(row.creatorClerkUserId) : '';
  if (!creatorClerkUserId) {
    return NextResponse.json({ error: 'Token misconfigured' }, { status: 500 });
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Clerk secret key not configured' }, { status: 500 });
  }

  const createTokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: creatorClerkUserId,
      expires_in_seconds: 300,
    }),
  });

  if (!createTokenRes.ok) {
    return NextResponse.json({ error: 'שגיאה ביצירת sign-in token' }, { status: 500 });
  }

  const createdJson: unknown = await createTokenRes.json().catch(() => null);
  const createdObj = asObject(createdJson);
  const signInToken = typeof createdObj?.token === 'string' ? String(createdObj.token) : null;
  if (!signInToken) {
    return NextResponse.json({ error: 'שגיאה ביצירת sign-in token' }, { status: 500 });
  }

  // Atomic update: only succeed if token is NOT already used (prevents race condition)
  let updatedToken;
  try {
    updatedToken = await prisma.devicePairingToken.updateMany({
      where: {
        id: String(row.id),
        used: { not: true },
        status: { not: 'CONSUMED' },
        consumedAt: null,
      },
      data: {
        used: true,
        status: 'CONSUMED',
        signInToken,
        consumedAt: now,
      },
    });
  } catch {
    return NextResponse.json({ error: 'שגיאה בשמירת סטטוס טוקן' }, { status: 500 });
  }

  // If count is 0, token was already consumed by another request
  if (updatedToken.count === 0) {
    return NextResponse.json({ error: 'Token already used' }, { status: 400 });
  }

  const res = NextResponse.json({
    success: true,
    signInToken,
    organizationId: orgId,
  });

  res.cookies.set('is_kiosk', 'true', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
    }
  );
}

export const POST = shabbatGuard(POSTHandler);
