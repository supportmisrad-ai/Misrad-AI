/**
 * LinkedIn OAuth Callback
 * Handles OAuth redirect from LinkedIn
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeLinkedInCode, getLinkedInProfile } from '@/lib/social-oauth/linkedin';
import { decryptState } from '@/lib/social-oauth/state-encryption';
import { saveClientToken } from '@/lib/social-oauth/save-token';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle user denial
    if (error) {
      logger.warn('LinkedInOAuth', `User denied access: ${error} - ${errorDescription}`);
      return NextResponse.redirect(new URL('/w/misrad-ai-hq/social?error=access_denied', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/w/misrad-ai-hq/social?error=missing_params', request.url));
    }

    // Decrypt and validate state
    const oauthState = decryptState(state);
    const redirectUri = `${request.nextUrl.origin}/api/oauth/linkedin/callback`;

    // 1. Exchange code for access token
    const tokenResponse = await exchangeLinkedInCode(code, redirectUri);

    // 2. Get user profile
    const profile = await getLinkedInProfile(tokenResponse.access_token);

    // 3. Save token
    await saveClientToken({
      orgSlug: oauthState.orgSlug,
      clientId: oauthState.clientId,
      platform: 'linkedin',
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : undefined,
      scope: tokenResponse.scope,
      platformUserId: `urn:li:person:${profile.id}`,
      platformPageName: `${profile.firstName} ${profile.lastName}`,
      platformAccountType: 'profile',
      metadata: {
        profilePicture: profile.profilePicture,
      },
    });

    // Success redirect
    const successUrl = oauthState.returnUrl || `/w/${oauthState.orgSlug}/social`;
    return NextResponse.redirect(new URL(`${successUrl}?success=linkedin_connected`, request.url));

  } catch (error) {
    logger.error('LinkedInOAuth', 'Callback error', error);
    return NextResponse.redirect(new URL('/w/misrad-ai-hq/social?error=oauth_failed', request.url));
  }
}
