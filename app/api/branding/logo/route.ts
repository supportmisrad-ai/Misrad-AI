import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
const GLOBAL_BRANDING_KEY = 'global_branding';

type GlobalBrandingValue = {
  defaultLogoUrl?: string | null;
};

async function GETHandler() {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('social_system_settings')
      .select('value')
      .eq('key', GLOBAL_BRANDING_KEY)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ defaultLogoUrl: null }, { status: 200 });
    }

    const value = (data?.value || {}) as GlobalBrandingValue;

    return NextResponse.json(
      {
        defaultLogoUrl: value?.defaultLogoUrl ?? null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ defaultLogoUrl: null }, { status: 200 });
  }
}

async function PATCHHandler(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = (await request.json().catch(() => null)) as { defaultLogoUrl?: string | null } | null;
    const nextUrl = body?.defaultLogoUrl === null ? null : typeof body?.defaultLogoUrl === 'string' ? body.defaultLogoUrl.trim() : undefined;

    const supabase = createClient();

    const value: GlobalBrandingValue = {
      defaultLogoUrl: nextUrl === undefined ? null : nextUrl,
    };

    const { error } = await supabase
      .from('social_system_settings')
      .upsert(
        {
          key: GLOBAL_BRANDING_KEY,
          value,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'key' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, defaultLogoUrl: value.defaultLogoUrl ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
