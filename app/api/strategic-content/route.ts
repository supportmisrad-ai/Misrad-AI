import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const dynamic = 'force-dynamic';

async function GETHandler(req: Request) {
  const url = new URL(req.url);
  const moduleId = url.searchParams.get('module_id');
  const category = url.searchParams.get('category');

  if (!moduleId) {
    return NextResponse.json({ error: 'Missing module_id' }, { status: 400 });
  }

  try {
    const supabase = createClient();

    let query = supabase
      .from('strategic_content')
      .select('id, category, title, content, module_id')
      .eq('module_id', moduleId)
      .order('category', { ascending: true })
      .order('title', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ items: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export const GET = shabbatGuard(GETHandler);
