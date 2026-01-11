/**
 * API Route: Test Google OAuth Configuration
 * 
 * GET /api/integrations/google/test
 * 
 * Tests if Google OAuth credentials are properly configured
 * This is a diagnostic endpoint to help debug OAuth setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { requireSuperAdmin } from '../../../../../lib/auth';

export async function GET(request: NextRequest) {
    try {
        try {
            await requireSuperAdmin();
        } catch (e: any) {
            return NextResponse.json({ configured: false, error: e?.message || 'Forbidden - Super Admin required' }, { status: 403 });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/integrations/google/callback`;

        // Check if credentials are set
        const hasClientId = !!clientId;
        const hasClientSecret = !!clientSecret;
        const hasRedirectUri = !!redirectUri;

        // Try to create OAuth client (this will validate the credentials format)
        let clientCreated = false;
        let clientError: string | null = null;
        
        try {
            if (hasClientId && hasClientSecret) {
                const client = new OAuth2Client(
                    clientId,
                    clientSecret,
                    redirectUri
                );
                clientCreated = true;
            }
        } catch (error: any) {
            clientError = error.message;
        }

        // Check if client ID has correct format
        const clientIdFormatValid = hasClientId && clientId.includes('.apps.googleusercontent.com');
        
        // Return diagnostic information
        return NextResponse.json({
            configured: hasClientId && hasClientSecret,
            details: {
                hasClientId,
                hasClientSecret,
                hasRedirectUri,
                clientIdFormatValid,
                clientCreated,
                clientError,
                redirectUri,
                redirectUriFromEnv: process.env.GOOGLE_REDIRECT_URI || 'NOT SET (using default)',
                clientIdPreview: hasClientId ? `${clientId.substring(0, 20)}...` : null
            },
            recommendations: {
                ...(!hasClientId && { 
                    missingClientId: 'הוסף GOOGLE_CLIENT_ID ל-.env.local' 
                }),
                ...(!hasClientSecret && { 
                    missingClientSecret: 'הוסף GOOGLE_CLIENT_SECRET ל-.env.local' 
                }),
                ...(hasClientId && !clientIdFormatValid && { 
                    invalidClientIdFormat: 'GOOGLE_CLIENT_ID צריך להכיל .apps.googleusercontent.com' 
                }),
                ...(clientError && { 
                    clientCreationError: `שגיאה ביצירת OAuth client: ${clientError}` 
                }),
                ...(hasClientId && hasClientSecret && clientCreated && {
                    ready: '✅ המפתחות מוגדרים נכון! אתה יכול לנסות להתחבר.'
                })
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            configured: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
