import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createClient } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

type FeatureSettingsRow = {
  id: string;
  organization_id: string | null;
  feature_key: string;
  enabled: boolean;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  base_prompt?: string | null;
  reserve_cost_cents: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
};

async function GETHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const url = new URL(req.url);
    const organizationId = (url.searchParams.get('organizationId') || '').trim();
    const featureKeyQuery = (url.searchParams.get('q') || '').trim();
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 200)));

    const supabase = createClient();

    let query = supabase
      .from('ai_feature_settings')
      .select('*')
      .order('feature_key', { ascending: true })
      .limit(limit);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (featureKeyQuery) {
      query = query.ilike('feature_key', `%${featureKeyQuery}%`);
    }

    const { data, error } = await query;
    if (error) return apiError(error, { status: 500 });

    return apiSuccess({ rows: (data || []) as FeatureSettingsRow[] });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

async function POSTHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const body = (await req.json().catch(() => ({}))) as Partial<FeatureSettingsRow> & {
      organization_id?: string | null;
      feature_key?: string;
    };

    const featureKey = String(body.feature_key || '').trim();
    if (!featureKey) return apiError('feature_key is required', { status: 400 });

    const organizationId = body.organization_id === null ? null : body.organization_id ? String(body.organization_id) : null;

    const patch: any = {
      organization_id: organizationId,
      feature_key: featureKey,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
      primary_provider: String(body.primary_provider || 'google'),
      primary_model: String(body.primary_model || 'gemini-2.0-pro'),
      fallback_provider: body.fallback_provider ? String(body.fallback_provider) : null,
      fallback_model: body.fallback_model ? String(body.fallback_model) : null,
      base_prompt: body.base_prompt !== undefined ? (body.base_prompt === null ? null : String(body.base_prompt)) : null,
      reserve_cost_cents: Number.isFinite(Number(body.reserve_cost_cents)) ? Math.max(0, Math.floor(Number(body.reserve_cost_cents))) : 25,
      timeout_ms: Number.isFinite(Number(body.timeout_ms)) ? Math.max(1000, Math.floor(Number(body.timeout_ms))) : 30000,
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    const { data, error } = await supabase
      .from('ai_feature_settings')
      .upsert(patch as any, { onConflict: 'organization_id,feature_key' })
      .select('*')
      .maybeSingle();

    if (error) return apiError(error, { status: 500 });

    return apiSuccess({ row: data as any });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

async function DELETEHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const url = new URL(req.url);
    const featureKey = (url.searchParams.get('featureKey') || '').trim();
    const organizationIdRaw = url.searchParams.get('organizationId');

    if (!featureKey) return apiError('featureKey is required', { status: 400 });

    const supabase = createClient();
    let q = supabase.from('ai_feature_settings').delete().eq('feature_key', featureKey);

    if (organizationIdRaw === null) {
      q = q.is('organization_id', null);
    } else {
      const organizationId = String(organizationIdRaw || '').trim();
      if (organizationId) q = q.eq('organization_id', organizationId);
      else q = q.is('organization_id', null);
    }

    const { error } = await q;
    if (error) return apiError(error, { status: 500 });

    return apiSuccess({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);

export const DELETE = shabbatGuard(DELETEHandler);
