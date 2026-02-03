import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
  const row = await prisma.social_system_settings.findUnique({
    where: { key: LANDING_SETTINGS_KEY },
    select: { value: true },
  });

  const value = ((row as any)?.value || {}) as any;
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as LandingSettings) : {};
}

async function GETHandler() {
  try {
    const current = await readCurrentSettings(null as any);

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

    const current = await readCurrentSettings(null as any);

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

    try {
      await prisma.social_system_settings.upsert({
        where: { key: LANDING_SETTINGS_KEY },
        create: {
          key: LANDING_SETTINGS_KEY,
          value: next as any,
          updated_at: new Date(),
          created_at: new Date(),
        } as any,
        update: {
          value: next as any,
          updated_at: new Date(),
        } as any,
      });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
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
