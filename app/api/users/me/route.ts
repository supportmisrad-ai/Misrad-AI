/**
 * Get current authenticated user from database by Clerk email
 * 
 * This endpoint matches the Clerk user's email with a user in the users table
 */

import { NextRequest, NextResponse } from 'next/server';
import { isTenantAdmin, getOwnedTenant } from '../../../../lib/auth';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        const orgHeader = request.headers.get('x-org-id');
        if (!orgHeader) {
            return NextResponse.json(
                { error: 'Missing organization context (x-org-id)' },
                { status: 400 }
            );
        }

        const resolved = await resolveWorkspaceCurrentUserForApi(orgHeader);

        const tenant = await getOwnedTenant();
        const tenantAdminStatus = await isTenantAdmin(tenant?.id);

        return NextResponse.json({
            user: resolved.user,
            clerkUser: resolved.clerkUser,
            tenant: tenant
                ? {
                    id: tenant.id,
                    name: tenant.name,
                    ownerEmail: tenant.ownerEmail,
                }
                : null,
            isTenantAdmin: tenantAdminStatus,
            matched: true,
        });

    } catch (error: any) {
        console.error('[API] Error in /api/users/me:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);
