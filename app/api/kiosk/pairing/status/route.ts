import { NextRequest } from 'next/server';
import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';
import { apiError, apiSuccess } from '@/lib/server/api-response';
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

  const body = await request.json().catch(() => ({} as any));
  const code = String(body?.code || '').trim().toUpperCase();
  const deviceNonce = String(body?.deviceNonce || '').trim();

  if (!code || !deviceNonce) {
    return apiError('Missing code/deviceNonce', { status: 400 });
  }

  const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'kiosk_pairing_status' });

  const { data: row, error } = await supabase
    .from('device_pairing_tokens')
    .select('*')
    .eq('code', code)
    .eq('device_nonce', deviceNonce)
    .maybeSingle();

  if (error) {
    return apiError('שגיאה בטעינת סטטוס', { status: 500 });
  }

  if (!row?.id) {
    return apiSuccess({ status: 'NOT_FOUND' });
  }

  const orgId = row.organization_id ? String(row.organization_id) : null;
  const scoped = orgId
    ? createServiceRoleClientScoped({
        reason: 'kiosk_pairing_status_update',
        scopeColumn: 'organization_id',
        scopeId: orgId,
      })
    : supabase;

  const now = new Date();
  const expiresAt = row.expires_at ? new Date(String(row.expires_at)) : null;
  const isExpired = expiresAt ? expiresAt.getTime() <= now.getTime() : false;

  if (isExpired && String(row.status || '').toUpperCase() === 'PENDING') {
    await scoped
      .from('device_pairing_tokens')
      .update({ status: 'EXPIRED', updated_at: now.toISOString() } as any)
      .eq('id', row.id);

    return apiSuccess({ status: 'EXPIRED' });
  }

  const status = String(row.status || '').toUpperCase();

  if (status === 'APPROVED' && row.sign_in_token && !row.consumed_at) {
    await scoped
      .from('device_pairing_tokens')
      .update({ status: 'CONSUMED', consumed_at: now.toISOString(), updated_at: now.toISOString() } as any)
      .eq('id', row.id);

    return apiSuccess({
      status: 'APPROVED',
      signInToken: String(row.sign_in_token),
      organizationId: row.organization_id ? String(row.organization_id) : null,
    });
  }

  return apiSuccess({
    status,
    expiresAt: row.expires_at || null,
  });
}

export const POST = shabbatGuard(POSTHandler);
