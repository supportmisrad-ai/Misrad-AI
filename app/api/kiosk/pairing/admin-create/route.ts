import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createServiceRoleClientScoped } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';
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

    const supabase = createServiceRoleClientScoped({
      scopeColumn: 'organization_id',
      scopeId: String(workspace.id),
      reason: 'kiosk_pairing_admin_create',
    });

    for (let attempt = 0; attempt < 10; attempt++) {
      const token = generateToken();
      const code = generateCode();

      const insert = await supabase
        .from('device_pairing_tokens')
        .insert({
          code,
          token,
          device_nonce: null,
          status: 'PENDING',
          expires_at: expiresAt.toISOString(),
          organization_id: workspace.id,
          creator_clerk_user_id: user.id,
          used: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        } as any)
        .select('token, expires_at')
        .maybeSingle();

      if (!insert.error && insert.data?.token) {
        return apiSuccess({
          token: String(insert.data.token),
          expiresAt: String(insert.data.expires_at),
        });
      }

      const msg = String(insert.error?.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        continue;
      }

      return apiError('שגיאה ביצירת טוקן', { status: 500 });
    }

    return apiError('שגיאה ביצירת טוקן', { status: 500 });
  } catch (e: any) {
    if (e instanceof APIError) {
      return apiError(e, { status: e.status, message: e.message || 'Forbidden' });
    }
    return apiError(e, { status: 500, message: e?.message || 'Internal server error' });
  }
}

export const POST = shabbatGuard(POSTHandler);
