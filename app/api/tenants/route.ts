/**
 * API Route: Tenants
 * 
 * Handles creation and retrieval of tenants (businesses)
 */

import { NextRequest } from 'next/server';
import { apiError } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function GETHandler(_request: NextRequest) {
    return apiError('Gone - use /api/admin/tenants', { status: 410 });
}

async function POSTHandler(_request: NextRequest) {
    return apiError('Gone - use /api/admin/tenants', { status: 410 });
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
