import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
const GLOBAL_BRANDING_KEY = 'global_branding';

type GlobalBrandingValue = {
  defaultLogoUrl?: string | null;
};

function readGlobalBrandingValue(input: unknown): GlobalBrandingValue {
  const obj = asObject(input) ?? {};
  const defaultLogoUrlRaw = obj.defaultLogoUrl;
  return {
    defaultLogoUrl: defaultLogoUrlRaw == null ? null : typeof defaultLogoUrlRaw === 'string' ? defaultLogoUrlRaw : null,
  };
}

async function GETHandler() {
  try {
    const row = await prisma.social_system_settings.findUnique({
      where: { key: GLOBAL_BRANDING_KEY },
      select: { value: true },
    });

    const value = readGlobalBrandingValue(row?.value);

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

    const bodyJson: unknown = await request.json().catch(() => null);
    const bodyObj = asObject(bodyJson);
    const defaultLogoUrlRaw = bodyObj?.defaultLogoUrl;
    const nextUrl =
      defaultLogoUrlRaw === null ? null : typeof defaultLogoUrlRaw === 'string' ? defaultLogoUrlRaw.trim() : undefined;

    const value: GlobalBrandingValue = {
      defaultLogoUrl: nextUrl === undefined ? null : nextUrl,
    };

    try {
      await withTenantIsolationContext(
        {
          source: 'api_branding_logo',
          reason: 'PATCH',
          mode: 'global_admin',
          isSuperAdmin: true,
        },
        async () =>
          await prisma.social_system_settings.upsert({
            where: { key: GLOBAL_BRANDING_KEY },
            create: {
              key: GLOBAL_BRANDING_KEY,
              value: value as Prisma.InputJsonValue,
              updated_at: new Date(),
              created_at: new Date(),
            },
            update: {
              value: value as Prisma.InputJsonValue,
              updated_at: new Date(),
            },
          })
      );
    } catch (e: unknown) {
      return NextResponse.json({ error: getErrorMessage(e) || 'Failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, defaultLogoUrl: value.defaultLogoUrl ?? null }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) || 'Forbidden' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
