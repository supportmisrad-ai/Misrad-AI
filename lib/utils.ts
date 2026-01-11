/**
 * Utility Functions
 */

import { supabase } from './supabase';
import { NextRequest } from 'next/server';

/**
 * Get the base URL for the application
 * Handles production, Vercel, and localhost environments
 */
export function getBaseUrl(request?: NextRequest): string {
    // 1. Check explicit environment variable (highest priority)
    if (process.env.NEXT_PUBLIC_APP_URL) {
        const url = process.env.NEXT_PUBLIC_APP_URL.trim();
        // Remove trailing slash and check it's not a placeholder
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        if (!cleanUrl.includes('your-domain') && !cleanUrl.includes('localhost')) {
            return cleanUrl;
        }
    }

    // 2. Check Vercel URL (automatically set by Vercel)
    if (process.env.VERCEL_URL) {
        const protocol = process.env.VERCEL_ENV === 'production' ? 'https' : 'https';
        return `${protocol}://${process.env.VERCEL_URL}`;
    }

    // 3. Check request origin header (if available)
    if (request) {
        const origin = request.headers.get('origin');
        if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('your-domain')) {
            return origin;
        }

        // Try to get from host header
        const host = request.headers.get('host');
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('your-domain')) {
            const protocol = request.headers.get('x-forwarded-proto') || 'https';
            return `${protocol}://${host}`;
        }
    }

    // 4. Fallback to localhost (development only)
    console.warn('[getBaseUrl] No valid URL found, falling back to localhost. Please set NEXT_PUBLIC_APP_URL in Vercel.');
    return 'http://localhost:4000';
}

/**
 * Generate a unique invitation token
 */
export async function generateInvitationToken(): Promise<string> {
    if (!supabase) {
        throw new Error('Database not configured');
    }
    
    let token: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
        // Generate random token (32 characters, alphanumeric uppercase)
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        token = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
            .substring(0, 32);

        if (!token) {
            throw new Error('Failed to generate token');
        }

        // Check if token exists
        const { data, error } = await supabase
            .from('system_invitation_links')
            .select('token')
            .eq('token', token)
            .single();

        if (error && error.code === 'PGRST116') {
            // Token doesn't exist (PGRST116 = no rows returned)
            isUnique = true;
        } else if (error && error.code !== 'PGRST116') {
            // Other error - log but continue
            console.error('[Utils] Error checking token uniqueness:', error);
            // If table doesn't exist, assume token is unique
            if (error.message?.includes('does not exist') || error.code === '42P01') {
                isUnique = true;
            } else {
                attempts++;
                continue;
            }
        } else if (!error && data) {
            // Token exists, try again
            attempts++;
            continue;
        } else {
            // No error and no data - token is unique
            isUnique = true;
        }

        attempts++;
    }

    if (!isUnique || !token) {
        throw new Error('Failed to generate unique token after multiple attempts');
    }

    return token;
}

