import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const LANDING_SETTINGS_KEY = 'landing_settings';

type LandingSettings = {
  logo?: string | null;
  logoText?: string | null;
  founderImage?: string | null;
  videos?: any[] | null;
};

async function readCurrentSettings(supabase: any): Promise<LandingSettings> {
  const { data, error } = await supabase
    .from('social_system_settings')
    .select('value')
    .eq('key', LANDING_SETTINGS_KEY)
    .maybeSingle();

  if (error) return {};
  const value = (data?.value || {}) as any;
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as LandingSettings) : {};
}

async function GETHandler() {
  try {
    const supabase = createClient();
    const current = await readCurrentSettings(supabase);

    return NextResponse.json(
      {
        logo: current.logo ?? null,
        logoText: current.logoText ?? null,
        founderImage: current.founderImage ?? null,
        videos: Array.isArray(current.videos) ? current.videos : null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ logo: null, logoText: null, founderImage: null, videos: null }, { status: 200 });
  }
}

async function PATCHHandler(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const supabase = createClient();
    const current = await readCurrentSettings(supabase);

    const body = (await request.json().catch(() => null)) as Partial<LandingSettings> | null;

    const next: LandingSettings = {
      ...current,
    };

    if (body && Object.prototype.hasOwnProperty.call(body, 'logo')) {
      next.logo = body.logo === null ? null : typeof body.logo === 'string' ? body.logo : null;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, 'logoText')) {
      next.logoText = body.logoText === null ? null : typeof body.logoText === 'string' ? body.logoText : null;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, 'founderImage')) {
      next.founderImage = body.founderImage === null ? null : typeof body.founderImage === 'string' ? body.founderImage : null;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, 'videos')) {
      next.videos = Array.isArray(body.videos) ? body.videos : null;
    }

    const { error } = await supabase
      .from('social_system_settings')
      .upsert(
        {
          key: LANDING_SETTINGS_KEY,
          value: next,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'key' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        logo: next.logo ?? null,
        logoText: next.logoText ?? null,
        founderImage: next.founderImage ?? null,
        videos: Array.isArray(next.videos) ? next.videos : null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
