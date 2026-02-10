/**
 * API Route: Check AI API Key Status
 * GET /api/settings/ai-key
 * 
 * Checks if AI API key is configured in environment variables
 * 
 * Note: API keys should be stored as environment variables, not in the database.
 * This is more secure and follows best practices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();
        
        // 2. Check permissions - only admins can view AI key status
        await requirePermission('manage_system');
        
        // 3. Check if API key is configured in environment
        const apiKey = process.env.API_KEY;
        const isConfigured = !!apiKey && apiKey.trim().length > 0;
        
        // Don't expose the actual key, just the status
        return NextResponse.json({
            configured: isConfigured,
            message: isConfigured 
                ? 'מפתח AI מוגדר במשתני סביבה' 
                : 'מפתח AI לא מוגדר. הוסף API_KEY ל-.env.local או ב-Vercel'
        });
        
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        const obj = asObject(error) ?? {};
        const name = typeof obj.name === 'string' ? obj.name : undefined;
        if (IS_PROD) console.error('[API] Error checking AI key status');
        else
            console.error('[API] Error checking AI key status:', {
                message,
                name,
            });
        return NextResponse.json(
            { error: message || 'Internal server error' },
            { status: message.includes('Forbidden') ? 403 : 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);
