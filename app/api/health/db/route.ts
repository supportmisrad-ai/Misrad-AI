import { NextResponse } from 'next/server';
import { testConnection, isSupabaseConfigured } from '../../../../lib/supabase';
import { requireSuperAdmin } from '../../../../lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getErrorMessage } from '@/lib/shared/unknown';
const IS_PROD = process.env.NODE_ENV === 'production';
async function GETHandler() {
    try {
        try {
            await requireSuperAdmin();
        } catch (e: unknown) {
            const safeMsg = 'Forbidden - Super Admin required';
            return NextResponse.json(
                { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
                { status: 403 }
            );
        }

        const configured = isSupabaseConfigured();
        const connected = await testConnection();
        
        return NextResponse.json({
            supabase: {
                configured,
                connected,
                url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
                key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
                keyFormat: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('sb_') ? 'Project API Key' : 
                          process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('.') ? 'JWT Token' : 'Unknown'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: unknown) {
        const safeMsg = 'Internal server error';
        return NextResponse.json({
            error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg,
            supabase: {
                configured: false,
                connected: false
            }
        }, { status: 500 });
    }
}


export const GET = shabbatGuard(GETHandler);
