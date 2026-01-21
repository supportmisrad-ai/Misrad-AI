import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../../lib/supabase';
import { createServiceRoleClient } from '../../../../../lib/supabase';
import { requireSuperAdmin } from '../../../../../lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
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

    let db = supabase;
    try {
        db = createServiceRoleClient();
    } catch {
        db = supabase;
    }

    const results: Record<string, { exists: boolean; count?: number; error?: string }> = {};

    const extraTables = (() => {
        const raw = request.nextUrl.searchParams.get('extra');
        if (!raw) return [];
        return raw
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
    })();

    const prismaSchemaPath = `${process.cwd()}/prisma/schema.prisma`;
    let tableList: string[] = [];
    try {
        const { readFile } = await import('node:fs/promises');
        const raw = await readFile(prismaSchemaPath, 'utf8');
        const matches = raw.matchAll(/@@map\(\"([^\"]+)\"\)/g);
        const tables = new Set<string>();
        for (const m of matches) {
            const table = m?.[1];
            if (table) tables.add(table);
        }
        tableList = Array.from(tables).sort((a, b) => a.localeCompare(b));
    } catch {
        tableList = ['nexus_users', 'nexus_clients', 'nexus_tasks', 'nexus_time_entries', 'nexus_tenants'];
    }

    const tables = Array.from(new Set([...tableList, ...extraTables])).sort((a, b) => a.localeCompare(b));

    const concurrency = 10;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, tables.length) }).map(async () => {
        while (cursor < tables.length) {
            const table = tables[cursor++];
            try {
                const { error } = await db.from(table).select('*', { count: 'exact', head: true }).limit(1);
                if (error) {
                    if (error.code === 'PGRST116' || String(error.message || '').includes('does not exist')) {
                        results[table] = { exists: false, error: 'Table does not exist' };
                    } else {
                        results[table] = { exists: false, error: error.message };
                    }
                } else {
                    const { count: actualCount } = await db.from(table).select('*', { count: 'exact', head: true });
                    results[table] = { exists: true, count: actualCount || 0 };
                }
            } catch (error: any) {
                results[table] = { exists: false, error: error?.message || 'Unknown error' };
            }
        }
    });

    await Promise.all(workers);

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
        source: tableList.length ? 'prisma_schema' : 'fallback',
        timestamp: new Date().toISOString()
    });
}

export const GET = shabbatGuard(GETHandler);
