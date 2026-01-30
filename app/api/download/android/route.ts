import { NextRequest, NextResponse } from 'next/server';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function GETHandler(_request: NextRequest) {
  let url: string | null = null;
  try {
    const { getGlobalDownloadLinksUnsafe } = await import('@/lib/server/globalDownloadLinks');
    const links = await getGlobalDownloadLinksUnsafe();
    url = links.androidDownloadUrl;
  } catch {
    url = (process.env.MISRAD_ANDROID_DOWNLOAD_URL || '').trim() || null;
  }

  url = String(url ?? '').trim() || null;
  if (!url) {
    return NextResponse.json(
      {
        error: 'Not configured',
        message: 'MISRAD_ANDROID_DOWNLOAD_URL is not configured (and DB global_settings is empty)',
      },
      { status: 404 }
    );
  }

  return NextResponse.redirect(url);
}

export const GET = shabbatGuard(GETHandler);
