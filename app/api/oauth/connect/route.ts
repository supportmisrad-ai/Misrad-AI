/**
 * OAuth Connection Initiator
 * Generates OAuth URLs and redirects user to platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFacebookAuthUrl } from '@/lib/social-oauth/facebook';
import { getLinkedInAuthUrl } from '@/lib/social-oauth/linkedin';
import { encryptState } from '@/lib/social-oauth/state-encryption';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform') as 'facebook' | 'instagram' | 'linkedin';
    const clientId = searchParams.get('clientId');
    const orgSlug = searchParams.get('orgSlug');
    const returnUrl = searchParams.get('returnUrl');

    if (!platform || !clientId || !orgSlug) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Create encrypted state
    const state = encryptState({
      clientId,
      orgSlug,
      returnUrl: returnUrl || undefined,
    });

    const origin = request.nextUrl.origin;
    let authUrl: string;

    switch (platform) {
      case 'facebook':
      case 'instagram': {
        // Instagram uses Facebook OAuth
        const redirectUri = `${origin}/api/oauth/facebook/callback`;
        authUrl = getFacebookAuthUrl({ redirectUri, state });
        break;
      }

      case 'linkedin': {
        const redirectUri = `${origin}/api/oauth/linkedin/callback`;
        authUrl = getLinkedInAuthUrl({ redirectUri, state });
        break;
      }

      default:
        return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }

    // Redirect to OAuth provider
    return NextResponse.redirect(authUrl);

  } catch (error) {
    logger.error('OAuthConnect', 'Failed to initiate OAuth', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
  }
}
