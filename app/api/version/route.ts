import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(_request: NextRequest) {
  const { getAppVersionManifest } = await import('@/lib/server/appVersionManifest');

  const { manifest, source, error } = await getAppVersionManifest();

  if (!manifest) {
    const safeMsg = 'Not found';
    return NextResponse.json(
      IS_PROD
        ? {
            success: false,
            error: safeMsg,
          }
        : {
            success: false,
            error: error || 'Version manifest is not configured',
            source,
          },
      { status: 404, headers: { 'cache-control': 'no-store' } }
    );
  }

  return NextResponse.json(
    IS_PROD
      ? {
          success: true,
          manifest,
        }
      : {
          success: true,
          manifest,
          source,
        },
    { status: 200, headers: { 'cache-control': 'no-store' } }
  );
}

export const GET = GETHandler;
