/**
 * Utility Functions
 */

import { NextRequest } from 'next/server';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

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
    if (!IS_PROD) console.warn('[getBaseUrl] Falling back to localhost.');
    return 'http://localhost:4000';
}

/**
 * Generate a unique invitation token
 */
export async function generateInvitationToken(): Promise<string> {
    let token = '';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        try {
            const uuid = crypto.randomUUID();
            token = uuid.replace(/-/g, '').toUpperCase().slice(0, 32);
        } catch {
            const randomBytes = new Uint8Array(16);
            crypto.getRandomValues(randomBytes);
            token = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
        }

        if (!token) {
            throw new Error('Failed to generate token');
        }

        try {
            const { default: prisma } = await import('@/lib/prisma');
            const rows = await prisma.$queryRaw<Array<{ token: string }>>`
                select token
                from system_invitation_links
                where token = ${token}
                limit 1
            `;
            const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

            if (!existing) {
                return token;
            }
        } catch (error: unknown) {
            if (!IS_PROD) console.error('[Utils] Error checking token uniqueness:', error);
            else console.error('[Utils] Error checking token uniqueness');
            const message = getErrorMessage(error);
            const errObj = asObject(error) ?? {};
            const codeRaw = errObj.code;
            const code = typeof codeRaw === 'string' ? codeRaw.toLowerCase() : String(codeRaw ?? '').toLowerCase();
            const msgLower = String(message || '').toLowerCase();
            const isMissingTable = code === '42p01' || msgLower.includes('42p01') || msgLower.includes('does not exist') || msgLower.includes('undefined_table');
            if (isMissingTable) {
                if (!ALLOW_SCHEMA_FALLBACKS) {
                    throw new Error(`[SchemaMismatch] system_invitation_links missing table (${message || 'missing relation'})`);
                }
                reportSchemaFallback({
                    source: 'lib/utils.generateInvitationToken',
                    reason: 'system_invitation_links missing table (skip uniqueness check)',
                    error,
                });
                return token;
            }
        }

        attempts++;
    }

    return Promise.reject(new Error('Failed to generate unique token after multiple attempts'));
}
