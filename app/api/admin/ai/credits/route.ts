import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createClient } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

type AdjustCreditsBody = {
  organizationId: string;
  deltaCents: number;
};

async function GETHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const url = new URL(req.url);
    const organizationId = String(url.searchParams.get('organizationId') || '').trim();
    if (!organizationId) return apiError('organizationId is required', { status: 400 });

    const supabase = createClient();

    const { data, error } = await supabase.rpc('ai_get_credit_status', {
      p_organization_id: organizationId,
    });

    if (error) {
      return apiSuccess({
        organizationId,
        status: null,
        note: 'credit status RPC not available',
      });
    }

    const row = Array.isArray(data) ? data[0] : data;
    return apiSuccess({ organizationId, status: row || null });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

async function POSTHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const body = (await req.json().catch(() => ({}))) as Partial<AdjustCreditsBody>;
    const organizationId = String(body.organizationId || '').trim();
    const deltaCents = Math.floor(Number(body.deltaCents));

    if (!organizationId) return apiError('organizationId is required', { status: 400 });
    if (!Number.isFinite(deltaCents) || deltaCents === 0) {
      return apiError('deltaCents must be a non-zero number', { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase.rpc('ai_adjust_credits', {
      p_organization_id: organizationId,
      p_delta_cents: deltaCents,
    });

    if (error) {
      return apiError(error, { status: 500 });
    }

    return apiSuccess({ organizationId, deltaCents });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
