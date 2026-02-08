import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';

const LANDING_SETTINGS_KEY = 'landing_settings';

type LandingSettings = {
  logo?: string | null;
  logoText?: string | null;
  founderImage?: string | null;
  videos?: unknown[] | null;
};

function toJsonObject(value: unknown): Prisma.InputJsonObject {
  const normalized: unknown = JSON.parse(JSON.stringify(value ?? {}));
  return (asObject(normalized) ?? {}) as Prisma.InputJsonObject;
}

async function readCurrentSettings(): Promise<LandingSettings> {
  const row = await prisma.social_system_settings.findUnique({
    where: { key: LANDING_SETTINGS_KEY },
    select: { value: true },
  });

  const value: unknown = row?.value ?? {};
  const obj = asObject(value);
  return obj ? (obj as LandingSettings) : {};
}

async function GETHandler() {
  try {
    const current = await readCurrentSettings();

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

    const current = await readCurrentSettings();

    const body: unknown = await request.json().catch(() => null);
    const bodyObj = asObject(body);

    const next: LandingSettings = {
      ...current,
    };

    if (bodyObj && Object.prototype.hasOwnProperty.call(bodyObj, 'logo')) {
      const v = bodyObj.logo;
      next.logo = v === null ? null : typeof v === 'string' ? v : null;
    }

    if (bodyObj && Object.prototype.hasOwnProperty.call(bodyObj, 'logoText')) {
      const v = bodyObj.logoText;
      next.logoText = v === null ? null : typeof v === 'string' ? v : null;
    }

    if (bodyObj && Object.prototype.hasOwnProperty.call(bodyObj, 'founderImage')) {
      const v = bodyObj.founderImage;
      next.founderImage = v === null ? null : typeof v === 'string' ? v : null;
    }

    if (bodyObj && Object.prototype.hasOwnProperty.call(bodyObj, 'videos')) {
      const v = bodyObj.videos;
      next.videos = Array.isArray(v) ? v : null;
    }

    try {
      const value = toJsonObject(next);
      await withTenantIsolationContext(
        {
          source: 'api_landing_settings',
          reason: 'PATCH',
          mode: 'global_admin',
          isSuperAdmin: true,
        },
        async () =>
          await prisma.social_system_settings.upsert({
            where: { key: LANDING_SETTINGS_KEY },
            create: {
              key: LANDING_SETTINGS_KEY,
              value,
              updated_at: new Date(),
              created_at: new Date(),
            },
            update: {
              value,
              updated_at: new Date(),
            },
          })
      );
    } catch (e: unknown) {
      return NextResponse.json({ error: getUnknownErrorMessage(e) || 'Failed' }, { status: 500 });
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
  } catch (e: unknown) {
    return NextResponse.json({ error: getUnknownErrorMessage(e) || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
