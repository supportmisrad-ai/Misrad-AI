/**
 * Facebook OAuth Callback
 * Handles OAuth redirect from Facebook
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeFacebookCode, getLongLivedToken, getFacebookPages, getInstagramBusinessAccount } from '@/lib/social-oauth/facebook';
import { decryptState } from '@/lib/social-oauth/state-encryption';
import { saveClientToken } from '@/lib/social-oauth/save-token';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');

    // Handle user denial
    if (error) {
      logger.warn('FacebookOAuth', `User denied access: ${error} - ${errorReason}`);
      return NextResponse.redirect(new URL('/w/misrad-ai-hq/social?error=access_denied', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/w/misrad-ai-hq/social?error=missing_params', request.url));
    }

    // Decrypt and validate state
    const oauthState = decryptState(state);
    const redirectUri = `${request.nextUrl.origin}/api/oauth/facebook/callback`;

    // 1. Exchange code for short-lived token
    const shortToken = await exchangeFacebookCode(code, redirectUri);

    // 2. Exchange for long-lived token (60 days)
    const longToken = await getLongLivedToken(shortToken.access_token);

    // 3. Get user's Facebook Pages
    const pages = await getFacebookPages(longToken.access_token);

    if (pages.length === 0) {
      logger.warn('FacebookOAuth', 'No pages found for user');
      return NextResponse.redirect(new URL(`/w/${oauthState.orgSlug}/social?error=no_pages`, request.url));
    }

    // 4. Save tokens for each page (and Instagram if connected)
    for (const page of pages) {
      // Save Facebook Page token
      await saveClientToken({
        orgSlug: oauthState.orgSlug,
        clientId: oauthState.clientId,
        platform: 'facebook',
        accessToken: page.access_token,
        expiresAt: longToken.expires_in
          ? new Date(Date.now() + longToken.expires_in * 1000)
          : undefined,
        platformPageId: page.id,
        platformPageName: page.name,
        platformAccountType: 'page',
        metadata: {
          category: page.category,
          categoryList: page.category_list,
        },
      });

      // Check for Instagram Business Account
      const igAccount = await getInstagramBusinessAccount(page.id, page.access_token);
      
      if (igAccount) {
        await saveClientToken({
          orgSlug: oauthState.orgSlug,
          clientId: oauthState.clientId,
          platform: 'instagram',
          accessToken: page.access_token, // Use page token for Instagram API
          expiresAt: longToken.expires_in
            ? new Date(Date.now() + longToken.expires_in * 1000)
            : undefined,
          platformUserId: igAccount.id,
          platformPageId: page.id, // Link to parent page
          platformPageName: igAccount.username,
          platformAccountType: 'business',
        });
      }
    }

    // Success redirect
    const successUrl = oauthState.returnUrl || `/w/${oauthState.orgSlug}/social`;
    return NextResponse.redirect(new URL(`${successUrl}?success=facebook_connected`, request.url));

  } catch (error) {
    logger.error('FacebookOAuth', 'Callback error', error);
    return NextResponse.redirect(new URL('/w/misrad-ai-hq/social?error=oauth_failed', request.url));
  }
}
