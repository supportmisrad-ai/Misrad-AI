import { NextResponse } from 'next/server';
import { getGlobalDownloadLinksUnsafe } from '@/lib/server/globalDownloadLinks';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const links = await getGlobalDownloadLinksUnsafe();

    // Only expose admin download URL to authenticated users
    let isAuthenticated = false;
    try {
      await getAuthenticatedUser();
      isAuthenticated = true;
    } catch {
      // unauthenticated — strip sensitive URLs
    }

    return NextResponse.json({
      windowsDownloadUrl: links.windowsDownloadUrl ?? null,
      androidDownloadUrl: links.androidDownloadUrl ?? null,
      adminAndroidDownloadUrl: isAuthenticated ? (links.adminAndroidDownloadUrl ?? null) : null,
    });
  } catch {
    return NextResponse.json({ windowsDownloadUrl: null, androidDownloadUrl: null, adminAndroidDownloadUrl: null });
  }
}
