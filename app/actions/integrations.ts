'use server';

import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { createClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAuthUrl, GOOGLE_SCOPES, getAuthenticatedGoogleClient } from '@/lib/googleAuth';
import { google } from 'googleapis';
import { translateError } from '@/lib/errorTranslations';
import { encryptObject, decryptObject } from '@/lib/encryption';

/**
 * Get integration status
 */
export async function getIntegrationStatus(integrationName: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    const { data, error } = await supabase
      .from('integration_status')
      .select('*')
      .eq('name', integrationName)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { success: true, data: data || null };
  } catch (error: any) {
    console.error('Error getting integration status:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בקבלת סטטוס אינטגרציה') };
  }
}

/**
 * Get Google OAuth URL for Calendar
 */
export async function getGoogleCalendarAuthUrl() {
  try {
    const authUrl = getGoogleAuthUrl(GOOGLE_SCOPES.calendar);
    return { success: true, authUrl };
  } catch (error: any) {
    console.error('Error generating Google Calendar auth URL:', error);
    return { success: false, error: translateError(error.message || 'שגיאה ביצירת קישור הרשאה') };
  }
}

/**
 * Get Google OAuth URL for Drive
 */
export async function getGoogleDriveAuthUrl() {
  try {
    const authUrl = getGoogleAuthUrl(GOOGLE_SCOPES.drive);
    return { success: true, authUrl };
  } catch (error: any) {
    console.error('Error generating Google Drive auth URL:', error);
    return { success: false, error: translateError(error.message || 'שגיאה ביצירת קישור הרשאה') };
  }
}

/**
 * Get Google OAuth URL for Sheets
 */
export async function getGoogleSheetsAuthUrl() {
  try {
    const authUrl = getGoogleAuthUrl(GOOGLE_SCOPES.sheets);
    return { success: true, authUrl };
  } catch (error: any) {
    console.error('Error generating Google Sheets auth URL:', error);
    return { success: false, error: translateError(error.message || 'שגיאה ביצירת קישור הרשאה') };
  }
}

/**
 * Save Google OAuth tokens
 */
export async function saveGoogleTokens(
  integrationName: 'google_calendar' | 'google_drive' | 'google_sheets',
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
  scope?: string
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    // Save tokens
    const { error: tokenError } = await supabase
      .from('oauth_tokens')
      .upsert({
        user_id: supabaseUserId,
        integration_name: integrationName,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        scope: scope || '',
      }, {
        onConflict: 'user_id,integration_name',
      });

    if (tokenError) throw tokenError;

    // Update integration status
    const { error: statusError } = await supabase
      .from('integration_status')
      .upsert({
        name: integrationName,
        is_connected: true,
        last_sync: new Date().toISOString(),
      }, {
        onConflict: 'name',
      });

    if (statusError) throw statusError;

    return { success: true };
  } catch (error: any) {
    console.error('Error saving Google tokens:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בשמירת טוקנים') };
  }
}

/**
 * Sync Google Calendar events
 */
export async function syncGoogleCalendar() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    // Get stored tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', supabaseUserId)
      .eq('integration_name', 'google_calendar')
      .single();

    if (tokenError || !tokens) {
      throw new Error('Google Calendar לא מחובר');
    }

    // Get authenticated client
    const { client, newAccessToken } = await getAuthenticatedGoogleClient(
      tokens.access_token,
      tokens.refresh_token || undefined
    );

    // Update token if refreshed
    if (newAccessToken !== tokens.access_token) {
      await supabase
        .from('oauth_tokens')
        .update({ access_token: newAccessToken })
        .eq('id', tokens.id);
    }

    const calendar = google.calendar({ version: 'v3', auth: client });

    // Get events from last 30 days to next 90 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90);

    const { data: events } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Log sync
    await supabase.from('sync_logs').insert({
      user_id: supabaseUserId,
      integration_name: 'google_calendar',
      sync_type: 'calendar',
      status: 'success',
      items_synced: events.items?.length || 0,
      completed_at: new Date().toISOString(),
    });

    // Update last sync
    await supabase
      .from('integration_status')
      .update({ last_sync: new Date().toISOString() })
      .eq('name', 'google_calendar');

    return { success: true, events: events.items || [] };
  } catch (error: any) {
    console.error('Error syncing Google Calendar:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בסנכרון Google Calendar') };
  }
}

/**
 * Sync Google Drive files
 */
export async function syncGoogleDrive(clientId?: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    // Get stored tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', supabaseUserId)
      .eq('integration_name', 'google_drive')
      .single();

    if (tokenError || !tokens) {
      throw new Error('Google Drive לא מחובר');
    }

    // Get authenticated client
    const { client, newAccessToken } = await getAuthenticatedGoogleClient(
      tokens.access_token,
      tokens.refresh_token || undefined
    );

    // Update token if refreshed
    if (newAccessToken !== tokens.access_token) {
      await supabase
        .from('oauth_tokens')
        .update({ access_token: newAccessToken })
        .eq('id', tokens.id);
    }

    const drive = google.drive({ version: 'v3', auth: client });

    // Get files (images, videos, documents)
    const { data: files } = await drive.files.list({
      q: "mimeType contains 'image' or mimeType contains 'video' or mimeType contains 'pdf'",
      pageSize: 100,
      fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink, parents)',
      orderBy: 'modifiedTime desc',
    });

    // Log sync
    await supabase.from('sync_logs').insert({
      user_id: supabaseUserId,
      integration_name: 'google_drive',
      sync_type: 'drive',
      status: 'success',
      items_synced: files.files?.length || 0,
      completed_at: new Date().toISOString(),
    });

    // Update last sync
    await supabase
      .from('integration_status')
      .update({ last_sync: new Date().toISOString() })
      .eq('name', 'google_drive');

    return { success: true, files: files.files || [] };
  } catch (error: any) {
    console.error('Error syncing Google Drive:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בסנכרון Google Drive') };
  }
}

/**
 * Disconnect integration
 */
export async function disconnectIntegration(integrationName: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    // Delete tokens
    await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', supabaseUserId)
      .eq('integration_name', integrationName);

    // Delete credentials
    await supabase
      .from('integration_credentials')
      .delete()
      .eq('user_id', supabaseUserId)
      .eq('integration_name', integrationName);

    // Delete webhooks
    await supabase
      .from('webhook_configs')
      .delete()
      .eq('user_id', supabaseUserId)
      .eq('integration_name', integrationName);

    // Update status
    await supabase
      .from('integration_status')
      .update({ is_connected: false, last_sync: null })
      .eq('name', integrationName);

    return { success: true };
  } catch (error: any) {
    console.error('Error disconnecting integration:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בהתנתקות') };
  }
}

/**
 * Save webhook configuration (Zapier, Make)
 */
export async function saveWebhookConfig(
  integrationName: 'zapier' | 'make',
  webhookUrl: string,
  events: string[]
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    // Generate secret key
    const secretKey = crypto.randomUUID();

    const { error } = await supabase
      .from('webhook_configs')
      .upsert({
        user_id: supabaseUserId,
        integration_name: integrationName,
        webhook_url: webhookUrl,
        secret_key: secretKey,
        events: events,
        is_active: true,
      }, {
        onConflict: 'user_id,integration_name',
      });

    if (error) throw error;

    // Update integration status
    await supabase
      .from('integration_status')
      .upsert({
        name: integrationName,
        is_connected: true,
        last_sync: new Date().toISOString(),
      }, {
        onConflict: 'name',
      });

    return { success: true, secretKey };
  } catch (error: any) {
    console.error('Error saving webhook config:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בשמירת הגדרות webhook') };
  }
}

/**
 * Save Morning API credentials
 */
export async function saveMorningCredentials(apiKey: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    // Encrypt API key before storing
    const encryptedApiKey = await encryptObject({
      api_key: apiKey,
    });

    const { error } = await supabase
      .from('integration_credentials')
      .upsert({
        user_id: supabaseUserId,
        integration_name: 'morning',
        credential_type: 'api_key',
        encrypted_data: { encrypted: encryptedApiKey }, // Store encrypted string
      }, {
        onConflict: 'user_id,integration_name',
      });

    if (error) throw error;

    // Update integration status
    await supabase
      .from('integration_status')
      .upsert({
        name: 'morning',
        is_connected: true,
        last_sync: new Date().toISOString(),
      }, {
        onConflict: 'name',
      });

    return { success: true };
  } catch (error: any) {
    console.error('Error saving Morning credentials:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בשמירת פרטי Morning') };
  }
}

/**
 * Get and decrypt Morning API key
 */
export async function getMorningApiKey(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return null;
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    const { data, error } = await supabase
      .from('integration_credentials')
      .select('encrypted_data')
      .eq('user_id', supabaseUserId)
      .eq('integration_name', 'morning')
      .single();

    if (error || !data?.encrypted_data) {
      return null;
    }

    // Decrypt the API key
    const encryptedValue = data.encrypted_data.encrypted;
    if (!encryptedValue) {
      return null;
    }

    const decrypted = await decryptObject(encryptedValue);
    return decrypted.api_key || null;
  } catch (error) {
    console.error('Error getting Morning API key:', error);
    return null;
  }
}

/**
 * Get all integrations status
 */
export async function getAllIntegrationsStatus() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('integration_status')
      .select('*')
      .order('name');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error getting integrations status:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בקבלת סטטוס אינטגרציות') };
  }
}

