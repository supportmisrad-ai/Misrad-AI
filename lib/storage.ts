/**
 * Supabase Storage Utilities
 * 
 * Handles file uploads, downloads, and management in Supabase Storage
 */

import { supabase } from './supabase';

export interface UploadResult {
    url: string;
    signedUrl?: string;
    path: string;
    error?: string;
}

/**
 * Upload a file to Supabase Storage
 * 
 * @param file - File to upload
 * @param bucket - Storage bucket name (default: 'attachments')
 * @param folder - Optional folder path within bucket
 * @param userId - User ID for organizing files
 * @returns Upload result with URL and path
 */
export async function uploadFile(
    file: File | Blob,
    bucket: string = 'attachments',
    folder?: string,
    userId?: string
): Promise<UploadResult> {
    if (!supabase) {
        return {
            url: '',
            path: '',
            error: 'Supabase not configured'
        };
    }

    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const fileExtension = file instanceof File ? file.name.split('.').pop() : 'bin';
        const fileName = `${timestamp}-${randomStr}.${fileExtension}`;
        
        // Build file path
        let filePath = '';
        if (userId && folder) {
            filePath = `${userId}/${folder}/${fileName}`;
        } else if (userId) {
            filePath = `${userId}/${fileName}`;
        } else if (folder) {
            filePath = `${folder}/${fileName}`;
        } else {
            filePath = fileName;
        }

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileData, {
                contentType: file instanceof File ? file.type : 'application/octet-stream',
                upsert: false // Don't overwrite existing files
            });

        if (error) {
            console.error('[Storage] Upload error:', error);
            return {
                url: '',
                path: filePath,
                error: error.message
            };
        }

        const ref = `sb://${bucket}/${filePath}`;
        let signedUrl: string | undefined = undefined;
        try {
            const { data: signedData, error: signedErr } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 60 * 60);
            if (!signedErr && signedData?.signedUrl) signedUrl = String(signedData.signedUrl);
        } catch {
            // ignore
        }

        return {
            url: ref,
            signedUrl,
            path: filePath,
            error: undefined
        };

    } catch (error: any) {
        console.error('[Storage] Upload exception:', error);
        return {
            url: '',
            path: '',
            error: error.message || 'Upload failed'
        };
    }
}

/**
 * Delete a file from Supabase Storage
 * 
 * @param path - File path in storage
 * @param bucket - Storage bucket name (default: 'attachments')
 * @returns Success status
 */
export async function deleteFile(
    path: string,
    bucket: string = 'attachments'
): Promise<boolean> {
    if (!supabase) {
        console.error('[Storage] Supabase not configured');
        return false;
    }

    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.error('[Storage] Delete error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Storage] Delete exception:', error);
        return false;
    }
}

/**
 * Get public URL for a file
 * 
 * @param path - File path in storage
 * @param bucket - Storage bucket name (default: 'attachments')
 * @returns Public URL
 */
export function getFileUrl(
    path: string,
    bucket: string = 'attachments'
): string {
    if (!supabase) {
        return '';
    }

    return `sb://${bucket}/${path}`;
}

/**
 * List files in a folder
 * 
 * @param folder - Folder path
 * @param bucket - Storage bucket name (default: 'attachments')
 * @returns List of files
 */
export async function listFiles(
    folder?: string,
    bucket: string = 'attachments'
): Promise<Array<{ name: string; path: string; url: string }>> {
    if (!supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(folder || '', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) {
            console.error('[Storage] List error:', error);
            return [];
        }

        return (data || []).map(file => ({
            name: file.name,
            path: folder ? `${folder}/${file.name}` : file.name,
            url: getFileUrl(folder ? `${folder}/${file.name}` : file.name, bucket)
        }));
    } catch (error) {
        console.error('[Storage] List exception:', error);
        return [];
    }
}

