/**
 * API Route: Get Green Invoice Status
 * GET /api/integrations/green-invoice/status
 * 
 * Returns status of Green Invoice integration for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUsers } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch (authError: any) {
            return NextResponse.json({
                connected: false
            });
        }

        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        let workspaceId: string | null = null;
        if (orgIdFromHeader) {
            const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdFromHeader);
            workspaceId = workspace.id;
        } else {
            // Strict mode: no unscoped integration status
            return NextResponse.json({ connected: false });
        }

        if (!clerkUser.email) {
            return NextResponse.json({
                connected: false
            });
        }

        const bypassTenantIsolationE2e =
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === '1' ||
            String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').toLowerCase() === 'true';

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
        const allowUnscoped = bypassTenantIsolationE2e;
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return new NextResponse('Unscoped access forbidden in production', { status: 403 });
        }

        // 2. Find user in database
        let dbUsers: any[] = [];
        try {
            dbUsers = await getUsers({
                email: clerkUser.email,
                tenantId: workspaceId ?? undefined,
                allowUnscoped: Boolean((clerkUser as any)?.isSuperAdmin) || bypassTenantIsolationE2e,
            });
        } catch {
            dbUsers = [];
        }
        const user = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!user || !supabase) {
            return NextResponse.json({
                connected: false
            });
        }

        // 3. Check if integration exists
        let query = supabase
            .from('misrad_integrations')
            .select('id, is_active, last_synced_at, metadata')
            .eq('user_id', user.id)
            .eq('service_type', 'green_invoice')
            .eq('is_active', true);

        query = query.eq('tenant_id', workspaceId);

        let integration: any = null;
        let error: any = null;
        ({ data: integration, error } = await query.single());
        if (error?.code === '42703') {
            // Strict mode: schema mismatch (e.g. tenant_id missing) => treat as disconnected
            return NextResponse.json({ connected: false });
        }

        if (error || !integration) {
            return NextResponse.json({
                connected: false
            });
        }

        return NextResponse.json({
            connected: true,
            lastSynced: integration.last_synced_at,
            metadata: integration.metadata
        });

    } catch (error: any) {
        console.warn('[API] Error getting Green Invoice status (non-critical):', error.message);
        return NextResponse.json({
            connected: false
        });
    }
}


export const GET = shabbatGuard(GETHandler);
