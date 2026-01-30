import { NextRequest } from 'next/server';
import { randomBytes, randomUUID } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase';
import { apiError, apiSuccess } from '@/lib/server/api-response';
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

  const body = await request.json().catch(() => ({} as any));
  const deviceNonce = String(body?.deviceNonce || '').trim() || randomUUID();

  const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'kiosk_pairing_create_or_refresh' });

  const existing = await supabase
    .from('device_pairing_tokens')
    .select('id, code, expires_at, status')
    .eq('device_nonce', deviceNonce)
    .maybeSingle();

  if (existing.data?.id) {
    const existingStatus = String((existing.data as any)?.status || '').toUpperCase();
    const existingExpiresAtRaw = (existing.data as any)?.expires_at;
    const existingExpiresAt = existingExpiresAtRaw ? new Date(String(existingExpiresAtRaw)) : null;
    const isStillValid =
      existingStatus === 'PENDING' && existingExpiresAt && existingExpiresAt.getTime() > now.getTime();

    if (isStillValid) {
      return apiSuccess({
        code: String((existing.data as any).code || '').toUpperCase(),
        deviceNonce,
        expiresAt: existingExpiresAt!.toISOString(),
      });
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateCode();

      const update = await supabase
        .from('device_pairing_tokens')
        .update({
          code,
          status: 'PENDING',
          expires_at: expiresAt.toISOString(),
          organization_id: null,
          approved_by_user_id: null,
          approved_for_user_id: null,
          approved_for_clerk_user_id: null,
          sign_in_token: null,
          approved_at: null,
          consumed_at: null,
          updated_at: now.toISOString(),
        } as any)
        .eq('id', existing.data.id)
        .select('code, device_nonce, expires_at')
        .maybeSingle();

      if (!update.error && update.data?.code) {
        return apiSuccess({
          code: String(update.data.code).toUpperCase(),
          deviceNonce: String(update.data.device_nonce),
          expiresAt: String(update.data.expires_at),
        });
      }

      const msg = String(update.error?.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        continue;
      }

      return apiError('שגיאה ביצירת קוד', { status: 500 });
    }

    return apiError('שגיאה ביצירת קוד', { status: 500 });
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();

    const insert = await supabase
      .from('device_pairing_tokens')
      .insert({
        code,
        device_nonce: deviceNonce,
        status: 'PENDING',
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      } as any)
      .select('code, device_nonce, expires_at')
      .maybeSingle();

    if (!insert.error && insert.data?.code) {
      return apiSuccess({
        code: insert.data.code,
        deviceNonce: insert.data.device_nonce,
        expiresAt: insert.data.expires_at,
      });
    }

    const msg = String(insert.error?.message || '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique')) {
      continue;
    }

    return apiError('שגיאה ביצירת קוד', { status: 500 });
  }

  return apiError('שגיאה ביצירת קוד', { status: 500 });
}

export const POST = shabbatGuard(POSTHandler);
