import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';
import { shabbatGuard } from '@/lib/api-shabbat-guard';

export const runtime = 'nodejs';

async function POSTHandler(request: NextRequest) {
  const pairingSecret = process.env.KIOSK_PAIRING_SECRET;
  if (!pairingSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Kiosk pairing is not configured' }, { status: 500 });
  }
  if (pairingSecret) {
    const header = request.headers.get('x-kiosk-secret');
    if (header !== pairingSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => ({} as any));
  const token = String(body?.token || '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'device_login_pairing_token_consume' });

  const { data: row, error } = await supabase
    .from('device_pairing_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'שגיאה בטעינת טוקן' }, { status: 500 });
  }

  if (!row?.id) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  const orgId = row.organization_id ? String(row.organization_id).trim() : '';
  if (!orgId) {
    return NextResponse.json({ error: 'Token misconfigured' }, { status: 500 });
  }

  const scoped = createServiceRoleClientScoped({
    reason: 'device_login_pairing_token_consume',
    scopeColumn: 'organization_id',
    scopeId: orgId,
  });

  const now = new Date();
  const expiresAt = row.expires_at ? new Date(String(row.expires_at)) : null;
  const isExpired = expiresAt ? expiresAt.getTime() <= now.getTime() : false;

  if (isExpired) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 });
  }

  if (row.used === true || String(row.status || '').toUpperCase() === 'CONSUMED' || row.consumed_at) {
    return NextResponse.json({ error: 'Token already used' }, { status: 400 });
  }

  const creatorClerkUserId = row.creator_clerk_user_id ? String(row.creator_clerk_user_id) : '';
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

  const created = await createTokenRes.json().catch(() => null as any);
  const signInToken = created?.token ? String(created.token) : null;
  if (!signInToken) {
    return NextResponse.json({ error: 'שגיאה ביצירת sign-in token' }, { status: 500 });
  }

  const updateQuery = scoped
    .from('device_pairing_tokens')
    .update({
      used: true,
      status: 'CONSUMED',
      sign_in_token: signInToken,
      consumed_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as any)
    .eq('id', row.id)
    .eq('token', token);

  const { error: updateError } = await updateQuery;
  if (updateError) {
    return NextResponse.json({ error: 'שגיאה בשמירת סטטוס טוקן' }, { status: 500 });
  }

  const res = NextResponse.json({
    success: true,
    signInToken,
    organizationId: orgId,
  });

  res.cookies.set('is_kiosk', 'true', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}

export const POST = shabbatGuard(POSTHandler);
