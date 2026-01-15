import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../../lib/supabase';
import { requireSuperAdmin } from '../../../../../lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler() {
    try {
        await requireSuperAdmin();
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Forbidden - Super Admin required' }, { status: 403 });
    }

    if (!isSupabaseConfigured || !supabase) {
        return NextResponse.json({
            error: 'Supabase not configured',
            tables: {}
        }, { status: 500 });
    }

    const tables = ['nexus_users', 'nexus_clients', 'nexus_tasks', 'nexus_time_entries', 'nexus_tenants'];
    const results: Record<string, { exists: boolean; count?: number; error?: string }> = {};

    for (const table of tables) {
        try {
            // Try to query the table
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .limit(1);

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    results[table] = { exists: false, error: 'Table does not exist' };
                } else {
                    results[table] = { exists: false, error: error.message };
                }
            } else {
                // Get actual count
                const { count: actualCount } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                results[table] = { 
                    exists: true, 
                    count: actualCount || 0 
                };
            }
        } catch (error: any) {
            results[table] = { 
                exists: false, 
                error: error.message || 'Unknown error' 
            };
        }
    }

    const allExist = Object.values(results).every(r => r.exists);
    const totalRecords = Object.values(results)
        .filter(r => r.exists)
        .reduce((sum, r) => sum + (r.count || 0), 0);

    return NextResponse.json({
        status: allExist ? 'healthy' : 'partial',
        tables: results,
        summary: {
            totalTables: tables.length,
            existingTables: Object.values(results).filter(r => r.exists).length,
            totalRecords,
            missingTables: tables.filter(t => !results[t]?.exists)
        },
        timestamp: new Date().toISOString()
    });
}


export const GET = shabbatGuard(GETHandler);
