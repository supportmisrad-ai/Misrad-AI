import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function GETHandler(_request: NextRequest) {
  const { getAppVersionManifest } = await import('@/lib/server/appVersionManifest');

  const { manifest, source, error } = await getAppVersionManifest();

  if (!manifest) {
    return NextResponse.json(
      {
        success: false,
        error: error || 'Version manifest is not configured',
        source,
      },
      { status: 404, headers: { 'cache-control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      manifest,
      source,
    },
    { status: 200, headers: { 'cache-control': 'no-store' } }
  );
}

export const GET = GETHandler;
