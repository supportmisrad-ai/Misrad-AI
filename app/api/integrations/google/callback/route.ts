import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/googleAuth';
import { saveGoogleTokensApi } from '@/lib/services/integrations/google-tokens-api';
import { getAuthenticatedUser } from '@/lib/auth';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(request: NextRequest) {
  try {
    // ✅ SECURITY FIX: Get current authenticated user for validation
    let currentUser;
    try {
      currentUser = await getAuthenticatedUser();
    } catch (e: unknown) {
      const errParam = IS_PROD ? 'unauthorized' : (getErrorMessage(e) || 'unauthorized');
      return NextResponse.redirect(
        new URL(`/settings?tab=integrations&error=${encodeURIComponent(errParam)}`, request.url)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=missing_params', request.url)
      );
    }

    // ✅ CRITICAL SECURITY FIX: Parse and validate state parameter
    let stateData: { service: string; userId: string; timestamp: number; nonce: string };
    try {
      stateData = JSON.parse(state);
    } catch {
      if (!IS_PROD) {
        console.error('[OAuth Callback] Failed to parse state parameter');
      }
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=invalid_state', request.url)
      );
    }

    // Validate state structure
    if (!stateData.service || !stateData.userId || !stateData.timestamp || !stateData.nonce) {
      if (!IS_PROD) {
        console.error('[OAuth Callback] State parameter missing required fields');
      }
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=invalid_state', request.url)
      );
    }

    // ✅ CRITICAL: Validate timestamp (max 10 minutes old)
    const maxAge = 10 * 60 * 1000; // 10 minutes
    if (Date.now() - stateData.timestamp > maxAge) {
      if (!IS_PROD) {
        console.error('[OAuth Callback] State expired:', {
          timestamp: stateData.timestamp,
          age: Date.now() - stateData.timestamp,
        });
      }
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=state_expired', request.url)
      );
    }

    // ✅ CRITICAL: Validate user matches - prevents user mismatch attacks
    if (currentUser.id !== stateData.userId) {
      if (!IS_PROD) {
        console.error('[OAuth Callback] User ID mismatch - potential security issue:', {
          expected: stateData.userId,
          actual: currentUser.id,
          timestamp: new Date().toISOString(),
        });
      }
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=user_mismatch', request.url)
      );
    }

    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=no_token', request.url)
      );
    }

    // Determine integration name from state
    const allowedIntegrationNames = new Set(['google_calendar', 'google_drive', 'google_sheets']);
    const integrationNameRaw = String(stateData.service || '').trim();
    if (!allowedIntegrationNames.has(integrationNameRaw)) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=invalid_state', request.url)
      );
    }
    const integrationName = integrationNameRaw as 'google_calendar' | 'google_drive' | 'google_sheets';

    // Calculate expiration
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // ✅ SECURITY FIX: Save tokens with explicit user validation
    const result = await saveGoogleTokensApi(
      integrationName,
      tokens.access_token,
      tokens.refresh_token || '',
      expiresAt,
      tokens.scope || undefined,
      stateData.userId // Pass expected userId for validation
    );

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/settings?tab=integrations&error=${encodeURIComponent(result.error || 'unknown')}`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/settings?tab=integrations&success=connected', request.url)
    );
  } catch (error: unknown) {
    const errParam = IS_PROD ? 'oauth_callback_failed' : (getErrorMessage(error) || 'unknown');
    if (IS_PROD) console.error('Google OAuth callback error');
    else console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/settings?tab=integrations&error=${encodeURIComponent(errParam)}`, request.url)
    );
  }
}


export const GET = shabbatGuard(GETHandler);
