/**
 * Google Drive Integration
 * 
 * Handles synchronization with Google Drive files
 * 
 * Note: This file does NOT use 'use server' because these are utility functions
 * used by API routes, not Server Actions.
 */

import { drive_v3, google } from 'googleapis';
import { supabase } from '../supabase';
import { refreshAccessToken } from './google-oauth';

/**
 * Get authenticated Google Drive client
 * 
 * @param userId - User ID
 * @param tenantId - Optional tenant ID
 * @returns Drive client or null if not connected
 */
export async function getDriveClient(
    userId: string,
    tenantId?: string
): Promise<drive_v3.Drive | null> {
    if (!supabase) {
        console.error('[Drive] Supabase not configured');
        return null;
    }

    // Find integration
    let query = (supabase as any)
        .from('misrad_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('service_type', 'google_drive')
        .eq('is_active', true)
        .single();

    if (tenantId) {
        query = query.eq('tenant_id', tenantId);
    }

    const { data: integration, error } = await query;

    if (error || !integration) {
        console.warn('[Drive] Integration not found for user:', userId);
        return null;
    }

    // Check if token is expired and refresh if needed
    let accessToken = integration.access_token;
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;

    if (expiresAt && expiresAt < new Date() && integration.refresh_token) {
        try {
            const refreshed = await refreshAccessToken(integration.refresh_token);
            accessToken = refreshed.accessToken;

            // Update database with new token
            await (supabase as any)
                .from('misrad_integrations')
                .update({
                    access_token: refreshed.accessToken,
                    expires_at: refreshed.expiresAt.toISOString(),
                    refresh_token: refreshed.refreshToken || integration.refresh_token,
                    updated_at: new Date().toISOString()
                })
                .eq('id', integration.id);
        } catch (error) {
            console.error('[Drive] Failed to refresh token:', error);
            return null;
        }
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: integration.refresh_token
    });

    // Create Drive client
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    return drive;
}

/**
 * List files from Google Drive
 * 
 * @param userId - User ID
 * @param tenantId - Optional tenant ID
 * @param pageSize - Number of files to return (default: 20)
 * @param pageToken - Token for pagination
 * @returns Files and next page token
 */
export async function listDriveFiles(
    userId: string,
    tenantId?: string,
    pageSize: number = 20,
    pageToken?: string
): Promise<{
    files: Array<{
        id: string;
        name: string;
        mimeType: string;
        modifiedTime: string;
        webViewLink?: string;
        size?: string;
    }>;
    nextPageToken?: string;
}> {
    const drive = await getDriveClient(userId, tenantId);
    if (!drive) {
        return { files: [] };
    }

    try {
        const response = await drive.files.list({
            pageSize,
            pageToken,
            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, size)',
            orderBy: 'modifiedTime desc',
            q: "trashed=false" // Exclude trashed files
        });

        const files = (response.data.files || []).map(file => ({
            id: file.id || '',
            name: file.name || '',
            mimeType: file.mimeType || '',
            modifiedTime: file.modifiedTime || '',
            webViewLink: file.webViewLink || undefined,
            size: file.size || undefined
        }));

        // Update last sync time
        if (supabase) {
            await (supabase as any)
                .from('misrad_integrations')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('user_id', userId)
                .eq('service_type', 'google_drive')
                .eq('is_active', true);
        }

        return {
            files,
            nextPageToken: response.data.nextPageToken || undefined
        };

    } catch (error: any) {
        console.error('[Drive] Error listing files:', error);
        return { files: [] };
    }
}

/**
 * Search files in Google Drive
 * 
 * @param userId - User ID
 * @param query - Search query (Google Drive query syntax)
 * @param tenantId - Optional tenant ID
 * @returns Matching files
 */
export async function searchDriveFiles(
    userId: string,
    query: string,
    tenantId?: string
): Promise<Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    webViewLink?: string;
}>> {
    const drive = await getDriveClient(userId, tenantId);
    if (!drive) {
        return [];
    }

    try {
        const response = await drive.files.list({
            q: `trashed=false and (${query})`,
            fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
            orderBy: 'modifiedTime desc',
            pageSize: 50
        });

        return (response.data.files || []).map(file => ({
            id: file.id || '',
            name: file.name || '',
            mimeType: file.mimeType || '',
            modifiedTime: file.modifiedTime || '',
            webViewLink: file.webViewLink || undefined
        }));

    } catch (error: any) {
        console.error('[Drive] Error searching files:', error);
        return [];
    }
}

/**
 * Upload file to Google Drive
 * 
 * @param userId - User ID
 * @param fileName - File name
 * @param fileContent - File content (Buffer or string)
 * @param mimeType - MIME type
 * @param tenantId - Optional tenant ID
 * @returns File ID
 */
export async function uploadDriveFile(
    userId: string,
    fileName: string,
    fileContent: Buffer | string,
    mimeType: string,
    tenantId?: string
): Promise<string | null> {
    const drive = await getDriveClient(userId, tenantId);
    if (!drive) {
        return null;
    }

    try {
        const response = await drive.files.create({
            requestBody: {
                name: fileName
            },
            media: {
                mimeType,
                body: fileContent
            }
        });

        return response.data.id || null;

    } catch (error: any) {
        console.error('[Drive] Error uploading file:', error);
        return null;
    }
}

