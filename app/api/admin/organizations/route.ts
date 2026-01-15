import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

async function GETHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 200)));

    const supabase = createClient();

    let query = supabase
      .from('organizations')
      .select('id, name, slug, owner_id, has_nexus, has_system, has_social, has_finance, has_client, subscription_status, subscription_plan, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (q) {
      query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, organizations: data || [] });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
