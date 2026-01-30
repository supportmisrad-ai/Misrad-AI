import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Creates a Google OAuth2 client
 */
export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/**
 * Gets an authenticated Google client using stored tokens
 */
export async function getAuthenticatedGoogleClient(
  accessToken: string,
  refreshToken?: string
) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Refresh token if needed
  if (refreshToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      return { client: oauth2Client, newAccessToken: credentials.access_token };
    } catch (error) {
      console.error('Error refreshing Google token:', {
        message: (error as any)?.message,
        name: (error as any)?.name,
      });
    }
  }

  return { client: oauth2Client, newAccessToken: accessToken };
}

/**
 * Generates Google OAuth authorization URL
 */
export function getGoogleAuthUrl(scopes: string[]): string {
  const oauth2Client = getGoogleOAuthClient();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
  });

  return authUrl;
}

/**
 * Google API Scopes
 */
export const GOOGLE_SCOPES = {
  calendar: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  drive: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
  ],
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
  all: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
};

