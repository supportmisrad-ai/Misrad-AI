import { NextRequest, NextResponse } from 'next/server';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(_request: NextRequest) {
  let url: string | null = null;
  try {
    const { getGlobalDownloadLinksUnsafe } = await import('@/lib/server/globalDownloadLinks');
    const links = await getGlobalDownloadLinksUnsafe();
    url = links.windowsDownloadUrl;
  } catch {
    url = (process.env.MISRAD_WINDOWS_DOWNLOAD_URL || '').trim() || null;
  }

  url = String(url ?? '').trim() || null;
  if (!url) {
    try {
      const { getAppVersionManifest, resolvePlatformDownloadUrl } = await import('@/lib/server/appVersionManifest');
      const { manifest } = await getAppVersionManifest();
      url = resolvePlatformDownloadUrl(manifest, 'windows');
    } catch {
      // ignore
    }
  }

  url = String(url ?? '').trim() || null;
  if (url && url.startsWith('sb://')) {
    try {
      const { parseSbRef } = await import('@/lib/services/operations/storage');
      const parsed = parseSbRef(url);
      if (parsed) {
        const { createServiceRoleStorageClient } = await import('@/lib/supabase');
        const supabase = createServiceRoleStorageClient({ allowUnscoped: true, reason: 'app_binary_signed_url' });
        const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60);
        const signedUrl = !error && data?.signedUrl ? String(data.signedUrl) : null;
        if (signedUrl) url = signedUrl;
      }
    } catch {
      // ignore
    }
  }

  url = String(url ?? '').trim() || null;
  if (!url) {
    const safeMsg = 'Not configured';
    return NextResponse.json(
      {
        error: 'Not configured',
        message: IS_PROD
          ? safeMsg
          : 'Windows download is not configured (DB global_settings, MISRAD_WINDOWS_DOWNLOAD_URL, and version manifest are empty)',
      },
      { status: 404 }
    );
  }

  return NextResponse.redirect(url);
}

export const GET = GETHandler;
