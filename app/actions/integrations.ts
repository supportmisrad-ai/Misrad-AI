'use server';

import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { createClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAuthUrl, GOOGLE_SCOPES, getAuthenticatedGoogleClient } from '@/lib/googleAuth';
import { google } from 'googleapis';
import { translateError } from '@/lib/errorTranslations';
import { encryptObject, decryptObject } from '@/lib/encryption';
import crypto from 'crypto';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

function isMissingTableError(error: any): boolean {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    msg.includes('public.integration_credentials') ||
    error?.code === '42P01' ||
    error?.code === 'PGRST205'
  );
}

async function requireOrganizationOwner(params: { orgSlug: string; clerkUserId: string }) {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const organizationId = workspace?.id ? String(workspace.id) : '';
  if (!organizationId) {
    throw new Error('ארגון לא נמצא');
  }

  const userResult = await getOrCreateSupabaseUserAction(params.clerkUserId);
  if (!userResult.success || !userResult.userId) {
    throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
  }

  const supabase = createClient();
  const { data: org, error } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .maybeSingle();

  if (error || !org?.owner_id) {
    throw new Error('שגיאה בקבלת בעלות על הארגון');
  }

  if (String(org.owner_id) !== String(userResult.userId)) {
    throw new Error('רק בעל הארגון יכול לצפות או לשנות את מפתח Morning');
  }

  return { workspace, organizationId, socialUserId: String(userResult.userId) };
}

async function resolveCredentialsTable(supabase: ReturnType<typeof createClient>): Promise<string> {
  const probe = await supabase.from('integration_credentials').select('id').limit(1);
  if (!probe.error) return 'integration_credentials';
  if (isMissingTableError(probe.error)) return 'social_integration_credentials';
  return 'integration_credentials';
}

export async function saveMorningCredentialsForWorkspace(orgSlug: string, apiKey: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, error: 'orgSlug חסר' };
    }

    const { organizationId, socialUserId } = await requireOrganizationOwner({ orgSlug: resolvedOrgSlug, clerkUserId: userId });

    const supabase = createClient();
    const table = await resolveCredentialsTable(supabase);

    const encryptedApiKey = await encryptObject({ api_key: apiKey });

    const { error } = await supabase
      .from(table)
      .upsert(
        {
          user_id: organizationId,
          integration_name: 'morning',
          credential_type: 'api_key',
          encrypted_data: { encrypted: encryptedApiKey },
          metadata: {
            scope: 'organization',
            organizationId,
            savedBy: socialUserId,
          },
        },
        {
          onConflict: 'user_id,integration_name',
        }
      );

    if (error) {
      return { success: false, error: translateError(error.message || 'שגיאה בשמירת פרטי Morning') };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving Morning credentials for workspace:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בשמירת פרטי Morning') };
  }
}

export async function hasMorningCredentialsForWorkspace(
  orgSlug: string
): Promise<{ success: boolean; connected: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: true, connected: false };

    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) return { success: true, connected: false };

    const workspace = await requireWorkspaceAccessByOrgSlug(resolvedOrgSlug);
    const organizationId = workspace?.id ? String(workspace.id) : '';
    if (!organizationId) return { success: true, connected: false };

    const supabase = createClient();
    const table = await resolveCredentialsTable(supabase);

    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('user_id', organizationId)
      .eq('integration_name', 'morning')
      .maybeSingle();

    if (error) {
      return { success: true, connected: false };
    }

    return { success: true, connected: !!data?.id };
  } catch {
    return { success: true, connected: false };
  }
}

export async function getMorningApiKeyForWorkspace(
  orgSlug: string
): Promise<{ success: boolean; apiKey?: string | null; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, apiKey: null, error: 'לא מחובר' };
    }

    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      return { success: false, apiKey: null, error: 'orgSlug חסר' };
    }

    const { organizationId } = await requireOrganizationOwner({ orgSlug: resolvedOrgSlug, clerkUserId: userId });

    const supabase = createClient();
    const table = await resolveCredentialsTable(supabase);

    const { data, error } = await supabase
      .from(table)
      .select('encrypted_data')
      .eq('user_id', organizationId)
      .eq('integration_name', 'morning')
      .maybeSingle();

    if (error || !data?.encrypted_data) {
      return { success: true, apiKey: null };
    }

    const encryptedValue = (data as any).encrypted_data?.encrypted;
    if (!encryptedValue) {
      return { success: true, apiKey: null };
    }

    const decrypted = await decryptObject(encryptedValue);
    return { success: true, apiKey: decrypted.api_key || null };
  } catch (error: any) {
    console.error('Error getting Morning API key for workspace:', error);
    return { success: false, apiKey: null, error: translateError(error.message || 'שגיאה בקבלת מפתח Morning') };
  }
}

export async function getAllIntegrationsStatusForWorkspace(orgSlug: string) {
  try {
    const base = await getAllIntegrationsStatus();
    const list = base.success && base.data ? [...base.data] : [];

    const morning = await hasMorningCredentialsForWorkspace(orgSlug);
    if (morning.success) {
      const idx = list.findIndex((x: any) => x?.name === 'morning');
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          is_connected: morning.connected,
        };
      } else {
        list.push({ name: 'morning', is_connected: morning.connected, last_sync: null });
      }
    }

    return { success: true, data: list };
  } catch (error: any) {
    console.error('Error getting integrations status for workspace:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בקבלת סטטוס אינטגרציות') };
  }
}

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

export async function triggerWebhookEvent(params: {
  eventType: string;
  payload: any;
  integrationName?: 'make' | 'zapier';
}): Promise<{ success: boolean; delivered?: number; error?: string }> {
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

    let query = supabase
      .from('webhook_configs')
      .select('*')
      .eq('user_id', supabaseUserId)
      .eq('is_active', true);

    if (params.integrationName) {
      query = query.eq('integration_name', params.integrationName);
    } else {
      query = query.in('integration_name', ['make', 'zapier']);
    }

    const { data: configs, error } = await query;
    if (error) throw error;

    const activeConfigs = (configs || []).filter((cfg: any) => {
      const events = Array.isArray(cfg.events) ? cfg.events : [];
      return events.includes(params.eventType);
    });

    if (activeConfigs.length === 0) {
      return { success: false, error: 'אין חיבור פעיל ל-Make/Zapier (או שהאירוע לא מופעל)' };
    }

    const body = {
      event_type: params.eventType,
      user_id: userId,
      payload: params.payload,
      occurred_at: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(body);

    let delivered = 0;
    for (const cfg of activeConfigs) {
      const secret = String(cfg.secret_key || '');
      const signature = secret
        ? crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
        : '';

      const res = await fetch(String(cfg.webhook_url), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(signature ? { 'x-social-signature': signature } : {}),
          'x-social-event': String(params.eventType),
          'x-social-integration': String(cfg.integration_name),
        },
        body: rawBody,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Webhook נכשל (${res.status}): ${text || 'תגובה לא תקינה'}`);
      }

      delivered += 1;

      await supabase
        .from('webhook_configs')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', cfg.id);
    }

    return { success: true, delivered };
  } catch (error: any) {
    console.error('Error triggering webhook event:', error);
    return { success: false, error: translateError(error.message || 'שגיאה בשליחת webhook') };
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
      .upsert(
        {
          user_id: supabaseUserId,
          integration_name: 'morning',
          credential_type: 'api_key',
          encrypted_data: { encrypted: encryptedApiKey }, // Store encrypted string
        },
        {
          onConflict: 'user_id,integration_name',
        }
      );

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

