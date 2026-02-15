import { NextRequest, NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { requireSuperAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { createServiceRoleStorageClient } from '@/lib/supabase';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';
import { parseSbRef, toSbRefMaybe } from '@/lib/services/operations/storage';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
const GLOBAL_BRANDING_KEY = 'global_branding';

const IS_PROD = process.env.NODE_ENV === 'production';

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

function isAllowedGlobalBrandingRef(ref: string): boolean {
  const parsed = parseSbRef(ref);
  if (!parsed) return false;
  if (parsed.bucket !== 'attachments') return false;
  if (!parsed.path.startsWith('global-branding/')) return false;
  return true;
}

async function resolveGlobalBrandingSignedUrl(ref: string, ttlSeconds: number): Promise<string | null> {
  try {
    const parsed = parseSbRef(ref);
    if (!parsed) return null;
    if (!isAllowedGlobalBrandingRef(ref)) return null;

    const sb = createServiceRoleStorageClient({ allowUnscoped: true, reason: 'storage_signed_url_resolve' });
    const { data, error } = await sb.storage.from(parsed.bucket).createSignedUrl(parsed.path, ttlSeconds);
    if (error || !data?.signedUrl) return null;
    return String(data.signedUrl);
  } catch {
    return null;
  }
}

function normalizeDefaultLogoValue(input: string | null): { stored: string | null; stableRef: string | null } {
  if (input === null) return { stored: null, stableRef: null };

  const trimmed = String(input || '').trim();
  if (!trimmed) return { stored: null, stableRef: null };

  const stableRef = trimmed.startsWith('sb://') ? trimmed : toSbRefMaybe(trimmed);
  if (stableRef && isAllowedGlobalBrandingRef(stableRef)) {
    return { stored: stableRef, stableRef };
  }

  return { stored: trimmed, stableRef: null };
}

async function GETHandler() {
  try {
    const row = await prisma.coreSystemSettings.findUnique({
      where: { key: GLOBAL_BRANDING_KEY },
      select: { value: true },
    });

    const value = readGlobalBrandingValue(row?.value);

    const normalized = normalizeDefaultLogoValue(value?.defaultLogoUrl ?? null);
    const storedRaw = value?.defaultLogoUrl == null ? null : String(value.defaultLogoUrl);
    if (
      storedRaw &&
      normalized.stableRef &&
      !storedRaw.trim().startsWith('sb://') &&
      normalized.stableRef !== storedRaw.trim()
    ) {
      try {
        await requireSuperAdmin();

        await withTenantIsolationContext(
          {
            source: 'api_branding_logo',
            reason: 'GET_migrate_default_logo_ref',
            mode: 'global_admin',
            isSuperAdmin: true,
          },
          async () =>
            await prisma.coreSystemSettings.update({
              where: { key: GLOBAL_BRANDING_KEY },
              data: {
                value: { defaultLogoUrl: normalized.stableRef } as Prisma.InputJsonValue,
                updated_at: new Date(),
              },
            })
        );
      } catch {
        // ignore (best-effort)
      }
    }

    const ttlSeconds = 60 * 60;
    const signed = normalized.stableRef ? await resolveGlobalBrandingSignedUrl(normalized.stableRef, ttlSeconds) : null;

    return NextResponse.json(
      {
        defaultLogoUrl: signed ?? (normalized.stableRef ? null : normalized.stored ?? null),
        defaultLogoRef: normalized.stableRef,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ defaultLogoUrl: null, defaultLogoRef: null }, { status: 200 });
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

    const normalized = normalizeDefaultLogoValue(nextUrl === undefined ? null : nextUrl);
    if (nextUrl !== null && nextUrl !== undefined && normalized.stored !== null && normalized.stableRef === null) {
      return NextResponse.json({ error: 'Invalid defaultLogoUrl' }, { status: 400 });
    }

    const value: GlobalBrandingValue = {
      defaultLogoUrl: normalized.stored,
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
          await prisma.coreSystemSettings.upsert({
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
      const safeMsg = 'Failed';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
        { status: 500 }
      );
    }

    const ttlSeconds = 60 * 60;
    const signed = normalized.stableRef ? await resolveGlobalBrandingSignedUrl(normalized.stableRef, ttlSeconds) : null;

    return NextResponse.json(
      {
        success: true,
        defaultLogoUrl: signed ?? (normalized.stableRef ? null : value.defaultLogoUrl ?? null),
        defaultLogoRef: normalized.stableRef,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const safeMsg = 'Forbidden';
    return NextResponse.json(
      { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
      { status: 403 }
    );
  }
}

export const GET = shabbatGuard(GETHandler);

export const PATCH = shabbatGuard(PATCHHandler);
