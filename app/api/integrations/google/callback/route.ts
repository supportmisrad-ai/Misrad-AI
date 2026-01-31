import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/googleAuth';
import { saveGoogleTokens } from '@/app/actions/integrations';
import { getAuthenticatedUser } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
  try {
    try {
      await getAuthenticatedUser();
    } catch (e: any) {
      return NextResponse.redirect(
        new URL(`/settings?tab=integrations&error=${encodeURIComponent(e?.message || 'unauthorized')}`, request.url)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains integration name

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=missing_params', request.url)
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
    const integrationNameRaw = String(state || '').trim();
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

    // Save tokens
    const result = await saveGoogleTokens(
      integrationName,
      tokens.access_token,
      tokens.refresh_token || '',
      expiresAt,
      tokens.scope || undefined
    );

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/settings?tab=integrations&error=${encodeURIComponent(result.error || 'unknown')}`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/settings?tab=integrations&success=connected', request.url)
    );
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/settings?tab=integrations&error=${encodeURIComponent(error.message || 'unknown')}`, request.url)
    );
  }
}


export const GET = shabbatGuard(GETHandler);
