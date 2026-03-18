'use server';



import { logger } from '@/lib/server/logger';
import { getOrCreateOrganizationUserAction } from '@/app/actions/social-users';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAuthUrl, GOOGLE_SCOPES, getAuthenticatedGoogleClient } from '@/lib/googleAuth';
import { google } from 'googleapis';
import { translateError } from '@/lib/errorTranslations';
import { encryptObject, decryptObject } from '@/lib/encryption';
import crypto from 'crypto';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import { saveGoogleTokensForOrganizationUser } from '@/lib/services/integrations/google-tokens';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';
async function requireOrganizationOwner(params: { orgSlug: string; clerkUserId: string }) {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const organizationId = requireOrganizationId('requireOrganizationOwner', workspace.id);

  const userResult = await getOrCreateOrganizationUserAction(params.clerkUserId);
  if (!userResult.success || !userResult.userId) {
    throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
  }

  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { owner_id: true },
  });

  if (!org?.owner_id) {
    throw new Error('שגיאה בקבלת בעלות על הארגון');
  }

  if (String(org.owner_id) !== String(userResult.userId)) {
    throw new Error('רק בעל הארגון יכול לצפות או לשנות את מפתח Morning');
  }

  return { workspace, organizationId, organizationUserId: String(userResult.userId) };
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

    const { organizationId, organizationUserId } = await requireOrganizationOwner({ orgSlug: resolvedOrgSlug, clerkUserId: userId });

    const encryptedApiKey = await encryptObject({ api_key: apiKey });
    const encrypted_data: Prisma.InputJsonValue = { encrypted: encryptedApiKey };
    const metadata: Prisma.InputJsonValue = {
      scope: 'organization',
      organizationId,
      savedBy: organizationUserId,
    };

    const existing = await prisma.integrationCredential.findFirst({
      where: { user_id: organizationId, integration_name: 'morning' },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.integrationCredential.updateMany({
        where: { id: existing.id },
        data: {
          credential_type: 'api_key',
          encrypted_data,
          metadata,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.integrationCredential.create({
        data: {
          user_id: organizationId,
          integration_name: 'morning',
          credential_type: 'api_key',
          encrypted_data,
          metadata,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }


    return { success: true };
  } catch (error: unknown) {
    logger.error('integrations', 'Error saving Morning credentials for workspace:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בשמירת פרטי Morning') };
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
    let organizationId: string;
    try {
      organizationId = requireOrganizationId('hasMorningCredentialsForWorkspace', workspace.id);
    } catch {
      return { success: true, connected: false };
    }

    const row = await prisma.integrationCredential.findFirst({
      where: { user_id: organizationId, integration_name: 'morning' },
      select: { id: true },
    });

    return { success: true, connected: Boolean(row?.id) };
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] integrationCredential missing table/column (${getErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/integrations.hasMorningCredentialsForWorkspace',
        reason: 'integrationCredential missing table/column (fallback to connected=false)',
        error: e,
        extras: { orgSlug: String(orgSlug || '') },
      });
    }
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

    const data = await prisma.integrationCredential.findFirst({
      where: { user_id: organizationId, integration_name: 'morning' },
      select: { encrypted_data: true },
    });

    if (!data?.encrypted_data) {
      return { success: true, apiKey: null };
    }

    const encryptedData = asObject(asObject(data)?.encrypted_data);
    const encryptedValue = encryptedData?.encrypted;
    const encryptedValueStr = typeof encryptedValue === 'string' ? encryptedValue : '';
    if (!encryptedValueStr) {
      return { success: true, apiKey: null };
    }

    const decrypted = await decryptObject(encryptedValueStr);
    const apiKey = typeof decrypted === 'object' && decrypted !== null && 'api_key' in decrypted
      ? String(decrypted.api_key || '')
      : '';
    return { success: true, apiKey: apiKey || null };
  } catch (error: unknown) {
    logger.error('integrations', 'Error getting Morning API key for workspace:', error);
    return { success: false, apiKey: null, error: translateError(getErrorMessage(error) || 'שגיאה בקבלת מפתח Morning') };
  }
}

export async function getAllIntegrationsStatusForWorkspace(orgSlug: string) {
  try {
    const base = await getAllIntegrationsStatus();
    const list: Array<Record<string, unknown>> =
      base.success && base.data ? (base.data as unknown[]).map((x) => asObject(x) ?? {}) : [];

    const morning = await hasMorningCredentialsForWorkspace(orgSlug);
    if (morning.success) {
      const idx = list.findIndex((x: unknown) => {
        const obj = asObject(x);
        return String(obj?.name || '') === 'morning';
      });
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
  } catch (error: unknown) {
    logger.error('integrations', 'Error getting integrations status for workspace:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בקבלת סטטוס אינטגרציות') };
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

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }

    const data = await prisma.integrationStatus.findUnique({
      where: { name: integrationName },
    });

    return { success: true, data: data || null };
  } catch (error: unknown) {
    logger.error('integrations', 'Error getting integration status:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בקבלת סטטוס אינטגרציה') };
  }
}

/**
 * Get Google OAuth URL for Calendar
 */
export async function getGoogleCalendarAuthUrl() {
  try {
    const authUrl = getGoogleAuthUrl(GOOGLE_SCOPES.calendar);
    return { success: true, authUrl };
  } catch (error: unknown) {
    logger.error('integrations', 'Error generating Google Calendar auth URL:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה ביצירת קישור הרשאה') };
  }
}

/**
 * Get Google OAuth URL for Drive
 */
export async function getGoogleDriveAuthUrl() {
  try {
    const authUrl = getGoogleAuthUrl(GOOGLE_SCOPES.drive);
    return { success: true, authUrl };
  } catch (error: unknown) {
    logger.error('integrations', 'Error generating Google Drive auth URL:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה ביצירת קישור הרשאה') };
  }
}

/**
 * Get Google OAuth URL for Sheets
 */
export async function getGoogleSheetsAuthUrl() {
  try {
    const authUrl = getGoogleAuthUrl(GOOGLE_SCOPES.sheets);
    return { success: true, authUrl };
  } catch (error: unknown) {
    logger.error('integrations', 'Error generating Google Sheets auth URL:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה ביצירת קישור הרשאה') };
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

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;

    await saveGoogleTokensForOrganizationUser({
      organizationUserId: String(supabaseUserId),
      integrationName,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
    });


    return { success: true };
  } catch (error: unknown) {
    logger.error('integrations', 'Error saving Google tokens:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בשמירת טוקנים') };
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

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;

    const tokens = await prisma.oAuthToken.findFirst({
      where: { user_id: supabaseUserId, integration_name: 'google_calendar' },
    });

    if (!tokens) {
      throw new Error('Google Calendar לא מחובר');
    }

    // Get authenticated client
    const { client, newAccessToken } = await getAuthenticatedGoogleClient(
      tokens.access_token,
      tokens.refresh_token || undefined
    );

    // Update token if refreshed
    if (typeof newAccessToken === 'string' && newAccessToken && newAccessToken !== tokens.access_token) {
      await prisma.oAuthToken.updateMany({
        where: { id: tokens.id },
        data: { access_token: newAccessToken, updated_at: new Date() },
      });
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

    await prisma.socialMediaSyncLog.create({
      data: {
        user_id: supabaseUserId,
        integration_name: 'google_calendar',
        sync_type: 'calendar',
        status: 'success',
        items_synced: events.items?.length || 0,
        completed_at: new Date(),
      },
    });

    return { success: true, events: events.items || [] };
  } catch (error: unknown) {
    logger.error('integrations', 'Error syncing Google Calendar:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בסנכרון Google Calendar') };
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

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;

    const tokens = await prisma.oAuthToken.findFirst({
      where: { user_id: supabaseUserId, integration_name: 'google_drive' },
    });

    if (!tokens) {
      throw new Error('Google Drive לא מחובר');
    }

    // Get authenticated client
    const { client, newAccessToken } = await getAuthenticatedGoogleClient(
      tokens.access_token,
      tokens.refresh_token || undefined
    );

    // Update token if refreshed
    if (typeof newAccessToken === 'string' && newAccessToken && newAccessToken !== tokens.access_token) {
      await prisma.oAuthToken.update({
        where: { id: tokens.id },
        data: { access_token: newAccessToken, updated_at: new Date() },
      });
    }

    const drive = google.drive({ version: 'v3', auth: client });

    // Get files (images, videos, documents)
    const { data: files } = await drive.files.list({
      q: "mimeType contains 'image' or mimeType contains 'video' or mimeType contains 'pdf'",
      pageSize: 100,
      fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink, parents)',
      orderBy: 'modifiedTime desc',
    });

    await prisma.socialMediaSyncLog.create({
      data: {
        user_id: supabaseUserId,
        integration_name: 'google_drive',
        sync_type: 'drive',
        status: 'success',
        items_synced: files.files?.length || 0,
        completed_at: new Date(),
      },
    });

    return { success: true, files: files.files || [] };
  } catch (error: unknown) {
    logger.error('integrations', 'Error syncing Google Drive:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בסנכרון Google Drive') };
  }
}

/**
 * Disconnect integration
 */
export async function disconnectIntegration(integrationName: string, orgSlug?: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;

    const resolvedIntegrationName = String(integrationName || '').trim();
    if (!resolvedIntegrationName) {
      throw new Error('integrationName חסר');
    }

    if (resolvedIntegrationName === 'morning') {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        throw new Error('orgSlug חסר');
      }

      const { organizationId } = await requireOrganizationOwner({ orgSlug: resolvedOrgSlug, clerkUserId: userId });
      await prisma.integrationCredential.deleteMany({
        where: { user_id: organizationId, integration_name: 'morning' },
      });

      return { success: true };
    }

    await prisma.oAuthToken.deleteMany({
      where: { user_id: supabaseUserId, integration_name: resolvedIntegrationName },
    });

    await prisma.integrationCredential.deleteMany({
      where: { user_id: supabaseUserId, integration_name: resolvedIntegrationName },
    });

    await prisma.webhookConfig.deleteMany({
      where: { user_id: supabaseUserId, integration_name: resolvedIntegrationName },
    });


    return { success: true };
  } catch (error: unknown) {
    logger.error('integrations', 'Error disconnecting integration:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בהתנתקות') };
  }
}

export async function triggerWebhookEvent(params: {
  eventType: string;
  payload: unknown;
  integrationName?: 'make' | 'zapier';
}): Promise<{ success: boolean; delivered?: number; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('לא מחובר');
    }

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;
    const where = {
      user_id: supabaseUserId,
      is_active: true,
      ...(params.integrationName
        ? { integration_name: params.integrationName }
        : { integration_name: { in: ['make', 'zapier'] } }),
    };
    const configs = await prisma.webhookConfig.findMany({ where });

    const configsList: unknown[] = Array.isArray(configs) ? (configs as unknown[]) : [];
    const activeConfigs = configsList.filter((cfg: unknown) => {
      const obj = asObject(cfg) ?? {};
      const events = Array.isArray(obj.events) ? obj.events.map((e) => String(e)) : [];
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
      const obj = asObject(cfg) ?? {};
      const secret = String(obj.secret_key || '');
      const signature = secret
        ? crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
        : '';

      const res = await fetch(String(obj.webhook_url), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(signature ? { 'x-social-signature': signature } : {}),
          'x-social-event': String(params.eventType),
          'x-social-integration': String(obj.integration_name),
        },
        body: rawBody,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Webhook נכשל (${res.status}): ${text || 'תגובה לא תקינה'}`);
      }

      delivered += 1;

      await prisma.webhookConfig.update({
        where: { id: String(obj.id || '') },
        data: { last_triggered_at: new Date(), updated_at: new Date() },
      });
    }

    return { success: true, delivered };
  } catch (error: unknown) {
    logger.error('integrations', 'Error triggering webhook event:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בשליחת webhook') };
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

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;

    // Generate secret key
    const secretKey = crypto.randomUUID();

    const existing = await prisma.webhookConfig.findFirst({
      where: { user_id: supabaseUserId, integration_name: integrationName },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.webhookConfig.update({
        where: { id: existing.id },
        data: {
          webhook_url: webhookUrl,
          secret_key: secretKey,
          events,
          is_active: true,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.webhookConfig.create({
        data: {
          user_id: supabaseUserId,
          integration_name: integrationName,
          webhook_url: webhookUrl,
          secret_key: secretKey,
          events,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    return { success: true, secretKey };
  } catch (error: unknown) {
    logger.error('integrations', 'Error saving webhook config:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בשמירת הגדרות webhook') };
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

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      throw new Error(userResult.error || 'שגיאה בקבלת משתמש');
    }
    const supabaseUserId = userResult.userId;

    // Encrypt API key before storing
    const encryptedApiKey = await encryptObject({
      api_key: apiKey,
    });
    const encrypted_data: Prisma.InputJsonValue = { encrypted: encryptedApiKey };

    const existing = await prisma.integrationCredential.findFirst({
      where: { user_id: supabaseUserId, integration_name: 'morning' },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.integrationCredential.update({
        where: { id: existing.id },
        data: {
          credential_type: 'api_key',
          encrypted_data,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.integrationCredential.create({
        data: {
          user_id: supabaseUserId,
          integration_name: 'morning',
          credential_type: 'api_key',
          encrypted_data,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }


    return { success: true };
  } catch (error: unknown) {
    logger.error('integrations', 'Error saving Morning credentials:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בשמירת פרטי Morning') };
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

    const userResult = await getOrCreateOrganizationUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return null;
    }
    const supabaseUserId = userResult.userId;

    const data = await prisma.integrationCredential.findFirst({
      where: { user_id: supabaseUserId, integration_name: 'morning' },
      select: { encrypted_data: true },
    });

    if (!data?.encrypted_data) {
      return null;
    }

    // Decrypt the API key
    const encryptedData = asObject(asObject(data)?.encrypted_data);
    const encryptedValue = encryptedData?.encrypted;
    const encryptedValueStr = typeof encryptedValue === 'string' ? encryptedValue : '';
    if (!encryptedValueStr) {
      return null;
    }

    const decrypted = await decryptObject(encryptedValueStr);
    const apiKey = typeof decrypted === 'object' && decrypted !== null && 'api_key' in decrypted
      ? String(decrypted.api_key || '')
      : '';
    return apiKey || null;
  } catch (error: unknown) {
    logger.error('integrations', 'Error getting Morning API key:', error);
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

    const data = await prisma.integrationStatus.findMany({
      orderBy: { name: 'asc' },
    });

    return { success: true, data: data || [] };
  } catch (error: unknown) {
    logger.error('integrations', 'Error getting integrations status:', error);
    return { success: false, error: translateError(getErrorMessage(error) || 'שגיאה בקבלת סטטוס אינטגרציות') };
  }
}

