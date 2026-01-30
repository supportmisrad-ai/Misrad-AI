/**
 * API Route: Tenant by ID
 * 
 * Handles update and deletion of specific tenants
 */

import { NextRequest } from 'next/server';
import { apiError } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function PATCHHandler(_request: NextRequest) {
    return apiError('Gone - use /api/admin/tenants/[id]', { status: 410 });
}

async function DELETEHandler(_request: NextRequest) {
    return apiError('Gone - use /api/admin/tenants/[id]', { status: 410 });
}

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
