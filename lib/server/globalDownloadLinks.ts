import 'server-only';

import { createClient } from '@/lib/supabase';

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
    const supabase = createClient();

    // Preferred storage: global_settings singleton row
    const { data: row, error } = await supabase
      .from('global_settings')
      .select('windows_download_url, android_download_url')
      .eq('id', 'global')
      .maybeSingle();

    if (error && !isMissingRelationError(error)) {
      return envFallback;
    }

    if (!error && row) {
      const windowsDownloadUrl = String((row as any)?.windows_download_url ?? '').trim() || null;
      const androidDownloadUrl = String((row as any)?.android_download_url ?? '').trim() || null;
      if (windowsDownloadUrl || androidDownloadUrl) {
        return { windowsDownloadUrl, androidDownloadUrl };
      }
      return envFallback;
    }

    // Fallback: legacy key-value storage
    const legacy = await supabase
      .from('social_system_settings')
      .select('value')
      .eq('key', LEGACY_KEY)
      .maybeSingle();

    if (!legacy.error) {
      const value = (legacy.data as any)?.value;
      const windowsDownloadUrl = String(value?.windowsDownloadUrl ?? value?.windows_download_url ?? '').trim() || null;
      const androidDownloadUrl = String(value?.androidDownloadUrl ?? value?.android_download_url ?? '').trim() || null;
      if (windowsDownloadUrl || androidDownloadUrl) {
        return { windowsDownloadUrl, androidDownloadUrl };
      }
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
  const supabase = createClient();

  const nextWindows = input.windowsDownloadUrl === undefined ? undefined : input.windowsDownloadUrl ? String(input.windowsDownloadUrl).trim() : null;
  const nextAndroid = input.androidDownloadUrl === undefined ? undefined : input.androidDownloadUrl ? String(input.androidDownloadUrl).trim() : null;

  const current = await getGlobalDownloadLinksUnsafe();
  const next: GlobalDownloadLinks = {
    windowsDownloadUrl: nextWindows === undefined ? current.windowsDownloadUrl : nextWindows,
    androidDownloadUrl: nextAndroid === undefined ? current.androidDownloadUrl : nextAndroid,
  };

  const now = new Date().toISOString();

  // Preferred storage: global_settings
  const { error } = await supabase
    .from('global_settings')
    .upsert(
      {
        id: 'global',
        windows_download_url: next.windowsDownloadUrl,
        android_download_url: next.androidDownloadUrl,
        updated_at: now,
      } as any,
      { onConflict: 'id' }
    );

  if (error && isMissingRelationError(error)) {
    // Fallback: legacy storage
    await supabase
      .from('social_system_settings')
      .upsert(
        {
          key: LEGACY_KEY,
          value: {
            windowsDownloadUrl: next.windowsDownloadUrl,
            androidDownloadUrl: next.androidDownloadUrl,
          },
          updated_at: now,
        } as any,
        { onConflict: 'key' }
      );

    return next;
  }

  if (error) {
    throw new Error(error.message);
  }

  return next;
}
