/**
 * API Route: Send Tenant Invitation Email
 * POST /api/tenants/[id]/send-invitation
 * 
 * Sends an invitation email to the tenant owner with a link to register
 */

import { NextRequest } from 'next/server';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function POSTHandler(_request: NextRequest) {
    return apiError('Gone - use /api/admin/tenants/[id]/send-invitation', { status: 410 });
}

export const POST = shabbatGuard(POSTHandler);
