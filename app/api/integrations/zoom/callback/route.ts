import { NextRequest, NextResponse } from 'next/server';
import { exchangeZoomCode } from '@/lib/integrations/zoom';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

/**
 * Zoom OAuth callback handler
 * Receives authorization code and exchanges it for access token
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('[Zoom OAuth] Error:', error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=zoom_auth_failed`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=missing_code`, request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeZoomCode(code);

    // Get user's organization
    const profile = await prisma.profile.findFirst({
      where: { clerkUserId: userId },
      select: { organizationId: true },
    });

    if (!profile?.organizationId) {
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=no_organization`, request.url)
      );
    }

    // Store integration
    await prisma.scale_integrations.upsert({
      where: {
        user_id_tenant_id_service_type: {
          user_id: userId,
          tenant_id: profile.organizationId,
          service_type: 'zoom',
        },
      },
      create: {
        user_id: userId,
        tenant_id: profile.organizationId,
        service_type: 'zoom',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt,
        is_active: true,
      },
      update: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt,
        is_active: true,
        updated_at: new Date(),
      },
    });

    return NextResponse.redirect(
      new URL(`/settings/integrations?success=zoom_connected`, request.url)
    );
  } catch (error) {
    console.error('[Zoom OAuth Callback] Error:', error);
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=zoom_connection_failed`, request.url)
    );
  }
}
