import { NextResponse } from 'next/server';
import { testConnection, isSupabaseConfigured } from '../../../../lib/supabase';
import { requireSuperAdmin } from '../../../../lib/auth';

export async function GET() {
    try {
        try {
            await requireSuperAdmin();
        } catch (e: any) {
            return NextResponse.json({ error: e?.message || 'Forbidden - Super Admin required' }, { status: 403 });
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
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            supabase: {
                configured: false,
                connected: false
            }
        }, { status: 500 });
    }
}

