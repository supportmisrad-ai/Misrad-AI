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
import { getAuthenticatedUser, requirePermission } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
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
        
    } catch (error: any) {
        console.error('[API] Error checking AI key status:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}
