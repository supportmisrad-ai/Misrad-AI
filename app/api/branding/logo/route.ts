import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
const GLOBAL_BRANDING_KEY = 'global_branding';

type GlobalBrandingValue = {
  defaultLogoUrl?: string | null;
};

async function GETHandler() {
  try {
    const row = await prisma.social_system_settings.findUnique({
      where: { key: GLOBAL_BRANDING_KEY },
      select: { value: true },
    });

    const value = (((row as any)?.value || {}) as any) as GlobalBrandingValue;

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

    const value: GlobalBrandingValue = {
      defaultLogoUrl: nextUrl === undefined ? null : nextUrl,
    };

    try {
      await prisma.social_system_settings.upsert({
        where: { key: GLOBAL_BRANDING_KEY },
        create: {
          key: GLOBAL_BRANDING_KEY,
          value: value as any,
          updated_at: new Date(),
          created_at: new Date(),
        } as any,
        update: {
          value: value as any,
          updated_at: new Date(),
        } as any,
      });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, defaultLogoUrl: value.defaultLogoUrl ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
