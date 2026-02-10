import 'server-only';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

export type GlobalDownloadLinks = {
  windowsDownloadUrl: string | null;
  androidDownloadUrl: string | null;
};

const LEGACY_KEY = 'global_download_links';

function isMissingRelationError(error: unknown): boolean {
  const obj = asObject(error);
  const message = String(obj?.message || '').toLowerCase();
  const code = String(obj?.code || '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
}

function safeJsonParseObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return asObject(parsed);
  } catch {
    return null;
  }
}

function fallbackFromEnv(): GlobalDownloadLinks {
  const windowsDownloadUrl = (process.env.MISRAD_WINDOWS_DOWNLOAD_URL || '').trim() || null;
  const androidDownloadUrl = (process.env.MISRAD_ANDROID_DOWNLOAD_URL || '').trim() || null;
  return { windowsDownloadUrl, androidDownloadUrl };
}

export async function getGlobalDownloadLinksUnsafe(): Promise<GlobalDownloadLinks> {
  const envFallback = fallbackFromEnv();

  try {
    // Preferred storage: global_settings singleton row
    const row = await prisma.global_settings.findUnique({
      where: { id: 'global' },
      select: { windows_download_url: true, android_download_url: true },
    });

    if (row) {
      const windowsDownloadUrl = String(row.windows_download_url ?? '').trim() || null;
      const androidDownloadUrl = String(row.android_download_url ?? '').trim() || null;
      if (windowsDownloadUrl || androidDownloadUrl) {
        return { windowsDownloadUrl, androidDownloadUrl };
      }
      return envFallback;
    }

    // Fallback: legacy key-value storage
    const legacy = await prisma.coreSystemSettings
      .findUnique({ where: { key: LEGACY_KEY }, select: { value: true } })
      .catch((e: unknown) => {
        if (isMissingRelationError(e)) {
          if (!ALLOW_SCHEMA_FALLBACKS) {
            throw new Error(`[SchemaMismatch] social_system_settings missing table (${getErrorMessage(e) || 'missing relation'})`);
          }
          return null;
        }
        throw e;
      });

    const legacyValueRaw = legacy?.value;
    const legacyValue =
      typeof legacyValueRaw === 'string' ? safeJsonParseObject(legacyValueRaw) : asObject(legacyValueRaw);

    const windowsDownloadUrl =
      String(legacyValue?.windowsDownloadUrl ?? legacyValue?.windows_download_url ?? '').trim() || null;
    const androidDownloadUrl =
      String(legacyValue?.androidDownloadUrl ?? legacyValue?.android_download_url ?? '').trim() || null;
    if (windowsDownloadUrl || androidDownloadUrl) {
      return { windowsDownloadUrl, androidDownloadUrl };
    }

    return envFallback;
  } catch (error: unknown) {
    if (isMissingRelationError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] global_settings missing table (${getErrorMessage(error) || 'missing relation'})`);
    }
    return envFallback;
  }
}

export async function setGlobalDownloadLinksUnsafe(input: {
  windowsDownloadUrl?: string | null;
  androidDownloadUrl?: string | null;
}): Promise<GlobalDownloadLinks> {
  const nextWindows = input.windowsDownloadUrl === undefined ? undefined : input.windowsDownloadUrl ? String(input.windowsDownloadUrl).trim() : null;
  const nextAndroid = input.androidDownloadUrl === undefined ? undefined : input.androidDownloadUrl ? String(input.androidDownloadUrl).trim() : null;

  const current = await getGlobalDownloadLinksUnsafe();
  const next: GlobalDownloadLinks = {
    windowsDownloadUrl: nextWindows === undefined ? current.windowsDownloadUrl : nextWindows,
    androidDownloadUrl: nextAndroid === undefined ? current.androidDownloadUrl : nextAndroid,
  };

  const now = new Date();

  // Preferred storage: global_settings
  try {
    await prisma.global_settings.upsert({
      where: { id: 'global' },
      update: {
        windows_download_url: next.windowsDownloadUrl,
        android_download_url: next.androidDownloadUrl,
        updated_at: now,
      },
      create: {
        id: 'global',
        windows_download_url: next.windowsDownloadUrl,
        android_download_url: next.androidDownloadUrl,
        updated_at: now,
      },
    });
  } catch (error: unknown) {
    if (isMissingRelationError(error)) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] global_settings missing table (${getErrorMessage(error) || 'missing relation'})`);
      }
      // Fallback: legacy storage
      try {
        await prisma.coreSystemSettings.upsert({
          where: { key: LEGACY_KEY },
          update: {
            value: {
              windowsDownloadUrl: next.windowsDownloadUrl,
              androidDownloadUrl: next.androidDownloadUrl,
            } as Prisma.InputJsonValue,
            updated_at: now,
          },
          create: {
            key: LEGACY_KEY,
            value: {
              windowsDownloadUrl: next.windowsDownloadUrl,
              androidDownloadUrl: next.androidDownloadUrl,
            } as Prisma.InputJsonValue,
            updated_at: now,
          },
        });
      } catch (legacyError: unknown) {
        if (isMissingRelationError(legacyError) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(`[SchemaMismatch] social_system_settings missing table (${getErrorMessage(legacyError) || 'missing relation'})`);
        }
        throw legacyError;
      }

      return next;
    }
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to update global download links');
  }

  return next;
}
