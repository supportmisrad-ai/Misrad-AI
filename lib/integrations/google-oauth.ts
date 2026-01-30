/**
 * Google OAuth Utilities
 * 
 * Handles OAuth 2.0 flow for Google services (Calendar, Drive, etc.)
 * 
 * Note: This file does NOT use 'use server' because these are utility functions
 * used by API routes, not Server Actions.
 */

import { OAuth2Client } from 'google-auth-library';
import { Buffer } from 'buffer';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/integrations/google/callback`;

/**
 * Create Google OAuth2 client
 * Internal function - not exported to avoid Next.js Server Actions requirement
 */
function getGoogleOAuthClient(): OAuth2Client {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    }

    return new OAuth2Client(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
    );
}

/**
 * Get OAuth authorization URL
 * 
 * @param serviceType - 'google_calendar' or 'google_drive'
 * @param userId - User ID for state parameter (to identify user after callback)
 * @param tenantId - Optional tenant ID
 */
export async function getGoogleAuthUrl(
    serviceType: 'google_calendar' | 'google_drive',
    userId: string,
    tenantId?: string
): Promise<string> {
    try {
        console.log('[Google OAuth] Creating OAuth client...');
        const client = getGoogleOAuthClient();
        console.log('[Google OAuth] OAuth client created successfully');
        
        // Determine scopes based on service type
        const scopes = serviceType === 'google_calendar'
            ? [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
              ]
            : [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/drive.readonly'
              ];

        console.log('[Google OAuth] Scopes:', scopes);

        // State parameter to identify user and service after callback
        const state = JSON.stringify({
            userId,
            tenantId: tenantId || null,
            serviceType,
            timestamp: Date.now()
        });

        console.log('[Google OAuth] Generating auth URL with state...');
        console.log('[Google OAuth] Redirect URI:', GOOGLE_REDIRECT_URI);
        
        // Encode state to base64
        // Buffer is available in Node.js server-side, but we'll use a safe approach
        const encodedState = typeof Buffer !== 'undefined' 
            ? Buffer.from(state).toString('base64')
            : btoa(unescape(encodeURIComponent(state)));
        
        const authUrl = client.generateAuthUrl({
            access_type: 'offline', // Required to get refresh token
            prompt: 'consent', // Force consent screen to get refresh token
            scope: scopes,
            state: encodedState,
            include_granted_scopes: true
        });

        // Extract redirect_uri from the generated URL for debugging
        const urlObj = new URL(authUrl);
        const redirectUriParam = urlObj.searchParams.get('redirect_uri');
        console.log('[Google OAuth] Redirect URI in auth URL:', redirectUriParam);
        console.log('[Google OAuth] Full auth URL:', authUrl);
        return authUrl;
    } catch (error: any) {
        console.error('[Google OAuth] Error in getGoogleAuthUrl:', error);
        console.error('[Google OAuth] Error details:', {
            message: error.message,
            stack: error.stack,
            hasClientId: !!GOOGLE_CLIENT_ID,
            hasClientSecret: !!GOOGLE_CLIENT_SECRET,
            redirectUri: GOOGLE_REDIRECT_URI
        });
        throw error;
    }
}

/**
 * Exchange authorization code for tokens
 * 
 * @param code - Authorization code from Google callback
 * @returns Tokens and user info
 */
export async function exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
    scope: string[];
    userInfo?: {
        email: string;
        name: string;
    };
}> {
    const client = getGoogleOAuthClient();
    
    const { tokens } = await client.getToken(code);
    
    if (!tokens.access_token) {
        throw new Error('Failed to get access token from Google');
    }

    // Set credentials to get user info
    client.setCredentials(tokens);
    
    // Get user info (optional, for metadata)
    let userInfo;
    try {
        const { google } = await import('googleapis');
        const oauth2 = google.oauth2('v2');
        const userInfoResponse = await oauth2.userinfo.get({ auth: client });
        userInfo = {
            email: userInfoResponse.data.email || '',
            name: userInfoResponse.data.name || ''
        };
    } catch (error) {
        // Silently fail - user info is optional
        console.warn('[Google OAuth] Could not fetch user info:', error);
    }

    // Calculate expiration time
    const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // Default: 1 hour

    return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        scope: tokens.scope?.split(' ') || [],
        userInfo
    };
}

/**
 * Refresh access token using refresh token
 * 
 * @param refreshToken - Refresh token from database
 * @returns New tokens
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken?: string; // New refresh token (if provided)
}> {
    const client = getGoogleOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await client.refreshAccessToken();
    
    if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
    }

    const expiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

    return {
        accessToken: credentials.access_token,
        expiresAt,
        refreshToken: credentials.refresh_token || undefined
    };
}

/**
 * Revoke access token
 * 
 * @param accessToken - Access token to revoke
 */
export async function revokeToken(accessToken: string): Promise<void> {
    const client = getGoogleOAuthClient();
    await client.revokeToken(accessToken);
}

