import { NextResponse } from 'next/server';
import { getZoomAuthUrl } from '@/lib/integrations/zoom';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Initiate Zoom OAuth flow
 * Redirects user to Zoom authorization page
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const authUrl = getZoomAuthUrl();
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (IS_PROD) console.error('[Zoom Connect] Error');
    else console.error('[Zoom Connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Zoom connection' },
      { status: 500 }
    );
  }
}
