/**
 * API Route: Google OAuth Authorization
 * 
 * GET /api/integrations/google/authorize
 * 
 * Initiates Google OAuth flow
 * 
 * Query params:
 *   - service: 'calendar' | 'drive'
 *   - userId: User ID (optional, will use authenticated user if not provided)
 *   - tenantId: Tenant ID (optional)
 * 
 * Returns: Redirects to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getGoogleAuthUrl } from '@/lib/integrations/google-oauth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        // Check if OAuth credentials are configured
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            console.error('[API] Google OAuth credentials not configured');
            const baseUrl = new URL(request.url);
            const redirectUrl = `${baseUrl.origin}/#/settings?tab=integrations&error=oauth_not_configured`;
            return NextResponse.redirect(redirectUrl);
        }

        // Get authenticated user
        const user = await getAuthenticatedUser();
        console.log('[Google OAuth] Authenticated user:', { id: user.id });
        
        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const service = searchParams.get('service');
        const tenantId = searchParams.get('tenantId');

        // Validate service type
        if (!service || !['calendar', 'drive'].includes(service)) {
            return NextResponse.json(
                { error: 'Invalid service type. Must be "calendar" or "drive"' },
                { status: 400 }
            );
        }

        const serviceType = service === 'calendar' ? 'google_calendar' : 'google_drive';
        console.log('[Google OAuth] Service type:', serviceType);

        // Generate authorization URL
        console.log('[Google OAuth] Generating auth URL...');
        const authUrl = await getGoogleAuthUrl(serviceType, user.id, tenantId || undefined);
        console.log('[Google OAuth] Auth URL generated successfully');

        // Redirect to Google OAuth consent screen
        return NextResponse.redirect(authUrl);

    } catch (error: any) {
        console.error('[API] Error in Google OAuth authorize:', {
            message: error?.message,
            name: error?.name,
            code: error?.code
        });
        
        // Check for specific OAuth configuration errors
        if (error.message?.includes('OAuth credentials not configured') || 
            error.message?.includes('GOOGLE_CLIENT_ID') ||
            error.message?.includes('GOOGLE_CLIENT_SECRET')) {
            const baseUrl = new URL(request.url);
            const redirectUrl = `${baseUrl.origin}/#/settings?tab=integrations&error=oauth_not_configured`;
            return NextResponse.redirect(redirectUrl);
        }
        
        return NextResponse.json(
            { 
                error: error.message || 'Failed to initiate Google OAuth',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);
