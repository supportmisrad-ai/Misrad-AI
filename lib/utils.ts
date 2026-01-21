/**
 * Utility Functions
 */

import { supabase } from './supabase';
import { NextRequest } from 'next/server';

function normalizeBaseUrl(input: string): string {
    const raw = (input || '').trim();
    if (!raw) return raw;

    const withProtocol = /^https?:\/\//i.test(raw)
        ? raw
        : `${/^(localhost|127\.0\.0\.1|\[::1\])/i.test(raw) ? 'http' : 'https'}://${raw}`;

    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
}

/**
 * Get the base URL for the application
 * Handles production, Vercel, and localhost environments
 */
export function getBaseUrl(request?: NextRequest): string {
    // 1. Check explicit environment variable (highest priority)
    if (process.env.NEXT_PUBLIC_APP_URL) {
        const url = process.env.NEXT_PUBLIC_APP_URL.trim();
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        if (!cleanUrl.includes('your-domain')) {
            return normalizeBaseUrl(cleanUrl);
        }
    }

    // 2. Check request origin/host headers (if available)
    if (request) {
        const origin = request.headers.get('origin');
        if (origin && !origin.includes('your-domain')) {
            return normalizeBaseUrl(origin);
        }

        // Try to get from host header
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        if (host && !host.includes('your-domain')) {
            const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
            return normalizeBaseUrl(`${protocol}://${host}`);
        }
    }

    // 3. Fallback to localhost (development only)
    console.warn('[getBaseUrl] NEXT_PUBLIC_APP_URL is not set; falling back to localhost.');
    return 'http://localhost:4000';
}

/**
 * Generate a unique invitation token
 */
export async function generateInvitationToken(): Promise<string> {
    if (!supabase) {
        throw new Error('Database not configured');
    }
    
    let token = '';
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

