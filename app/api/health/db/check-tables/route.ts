import { NextRequest, NextResponse } from 'next/server';
import prisma, { queryRawAllowlisted } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

import { getErrorMessage } from '@/lib/shared/unknown';
const IS_PROD = process.env.NODE_ENV === 'production';
function isSafeTableName(name: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(name);
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    return value as Record<string, unknown>;
}

function getErrorCode(error: unknown): string {
    const rec = asRecord(error);
    if (!rec) return '';
    const direct = rec.code;
    if (typeof direct === 'string') return direct;
    const meta = asRecord(rec.meta);
    return typeof meta?.code === 'string' ? String(meta.code) : '';
}


function isPgMissingTableError(error: unknown): boolean {
    const code = getErrorCode(error);
    if (code === '42P01') return true;
    const msg = getErrorMessage(error).toLowerCase();
    return msg.includes('does not exist') || msg.includes('undefined_table');
}

async function countTableRecords(table: string): Promise<number> {
    const rows = await queryRawAllowlisted<{ count: bigint | number | string }[]>(prisma, {
        reason: 'health_db_count_table_records',
        query: `SELECT COUNT(*)::bigint as count FROM ${table}`,
        values: [],
    });
    const raw = Array.isArray(rows) ? rows[0]?.count : 0;
    if (typeof raw === 'bigint') return Number(raw);
    if (typeof raw === 'number') return raw;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

async function GETHandler(request: NextRequest) {
    try {
        await requireSuperAdmin();
    } catch (e: unknown) {
        const safeMsg = 'Forbidden - Super Admin required';
        return NextResponse.json(
            { error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
            { status: 403 }
        );
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
            if (!isSafeTableName(table)) {
                results[table] = { exists: false, error: 'Invalid table name' };
                continue;
            }
            try {
                // Existence check
                await queryRawAllowlisted(prisma, {
                    reason: 'health_db_check_table_exists',
                    query: `SELECT 1 FROM ${table} LIMIT 1`,
                    values: [],
                });
                const actualCount = await countTableRecords(table);
                results[table] = { exists: true, count: actualCount || 0 };
            } catch (error: unknown) {
                if (isPgMissingTableError(error)) {
                    results[table] = { exists: false, error: 'Table does not exist' };
                } else {
                    const safeMsg = 'Internal server error';
                    results[table] = { exists: false, error: IS_PROD ? safeMsg : getErrorMessage(error) || safeMsg };
                }
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
