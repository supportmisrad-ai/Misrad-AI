/**
 * Zoom Integration Service
 * 
 * Handles Zoom OAuth and Meeting creation
 */

import prisma from '@/lib/prisma';

interface ZoomMeetingOptions {
  topic: string;
  start_time: string; // ISO 8601 format
  duration: number; // in minutes
  timezone?: string;
  agenda?: string;
}

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
  password?: string;
}

/**
 * Get Zoom OAuth credentials
 */
function getZoomCredentials() {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const redirectUri = process.env.ZOOM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/zoom/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Zoom OAuth credentials not configured. Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in environment variables.');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate Zoom OAuth URL
 */
export function getZoomAuthUrl(): string {
  const { clientId, redirectUri } = getZoomCredentials();
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeZoomCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const { clientId, clientSecret, redirectUri } = getZoomCredentials();

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom OAuth failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Refresh Zoom access token
 */
export async function refreshZoomToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const { clientId, clientSecret } = getZoomCredentials();

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Get valid Zoom access token (with auto-refresh)
 */
async function getZoomAccessToken(userId: string, tenantId: string): Promise<string | null> {
  const integration = await prisma.scale_integrations.findFirst({
    where: {
      user_id: userId,
      tenant_id: tenantId,
      service_type: 'zoom',
      is_active: true,
    },
  });

  if (!integration) {
    return null;
  }

  let accessToken = integration.access_token;
  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;

  // Refresh if expired
  if (expiresAt && expiresAt < new Date() && integration.refresh_token) {
    try {
      const refreshed = await refreshZoomToken(integration.refresh_token);
      accessToken = refreshed.accessToken;

      await prisma.scale_integrations.update({
        where: { id: integration.id },
        data: {
          access_token: refreshed.accessToken,
          expires_at: refreshed.expiresAt,
          refresh_token: refreshed.refreshToken,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      console.error('[Zoom] Token refresh failed:', error);
      return null;
    }
  }

  return accessToken;
}

/**
 * Create Zoom meeting
 */
export async function createZoomMeeting(
  userId: string,
  tenantId: string,
  options: ZoomMeetingOptions
): Promise<ZoomMeetingResponse | null> {
  const accessToken = await getZoomAccessToken(userId, tenantId);
  
  if (!accessToken) {
    throw new Error('Zoom not connected. Please connect your Zoom account first.');
  }

  try {
    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: options.topic,
        type: 2, // Scheduled meeting
        start_time: options.start_time,
        duration: options.duration,
        timezone: options.timezone || 'Asia/Jerusalem',
        agenda: options.agenda || '',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          audio: 'both',
          auto_recording: 'none',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Zoom API error: ${error.message || response.statusText}`);
    }

    const meeting: ZoomMeetingResponse = await response.json();

    return meeting;
  } catch (error) {
    console.error('[Zoom] Meeting creation failed:', error);
    throw error;
  }
}

/**
 * Delete Zoom meeting
 */
export async function deleteZoomMeeting(
  userId: string,
  tenantId: string,
  meetingId: number
): Promise<boolean> {
  const accessToken = await getZoomAccessToken(userId, tenantId);
  
  if (!accessToken) {
    return false;
  }

  try {
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[Zoom] Meeting deletion failed:', error);
    return false;
  }
}

/**
 * Check if user has Zoom connected
 */
export async function isZoomConnected(userId: string, tenantId: string): Promise<boolean> {
  const integration = await prisma.scale_integrations.findFirst({
    where: {
      user_id: userId,
      tenant_id: tenantId,
      service_type: 'zoom',
      is_active: true,
    },
  });

  return !!integration;
}
