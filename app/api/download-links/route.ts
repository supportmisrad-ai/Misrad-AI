import { NextResponse } from 'next/server';
import { getGlobalDownloadLinksUnsafe } from '@/lib/server/globalDownloadLinks';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const links = await getGlobalDownloadLinksUnsafe();
    return NextResponse.json(links);
  } catch {
    return NextResponse.json({ windowsDownloadUrl: null, androidDownloadUrl: null });
  }
}
