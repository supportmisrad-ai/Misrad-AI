import 'server-only';

import prisma from '@/lib/prisma';

export type GlobalDownloadLinks = {
  windowsDownloadUrl: string | null;
  androidDownloadUrl: string | null;
};

const LEGACY_KEY = 'global_download_links';

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
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
      const windowsDownloadUrl = String((row as any)?.windows_download_url ?? '').trim() || null;
      const androidDownloadUrl = String((row as any)?.android_download_url ?? '').trim() || null;
      if (windowsDownloadUrl || androidDownloadUrl) {
        return { windowsDownloadUrl, androidDownloadUrl };
      }
      return envFallback;
    }

    // Fallback: legacy key-value storage
    const legacy = await prisma.social_system_settings
      .findUnique({ where: { key: LEGACY_KEY }, select: { value: true } })
      .catch((e: any) => {
        if (isMissingRelationError(e)) return null;
        throw e;
      });

    const value = (legacy as any)?.value;
    const windowsDownloadUrl = String(value?.windowsDownloadUrl ?? value?.windows_download_url ?? '').trim() || null;
    const androidDownloadUrl = String(value?.androidDownloadUrl ?? value?.android_download_url ?? '').trim() || null;
    if (windowsDownloadUrl || androidDownloadUrl) {
      return { windowsDownloadUrl, androidDownloadUrl };
    }

    return envFallback;
  } catch {
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
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      // Fallback: legacy storage
      await prisma.social_system_settings.upsert({
        where: { key: LEGACY_KEY },
        update: {
          value: {
            windowsDownloadUrl: next.windowsDownloadUrl,
            androidDownloadUrl: next.androidDownloadUrl,
          } as any,
          updated_at: now as any,
        } as any,
        create: {
          key: LEGACY_KEY,
          value: {
            windowsDownloadUrl: next.windowsDownloadUrl,
            androidDownloadUrl: next.androidDownloadUrl,
          } as any,
          updated_at: now as any,
        } as any,
      });

      return next;
    }
    throw error instanceof Error ? error : new Error(String((error as any)?.message || 'Failed to update global download links'));
  }

  return next;
}
