/**
 * API Route: Get Green Invoice Status
 * GET /api/integrations/green-invoice/status
 * 
 * Returns status of Green Invoice integration for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectDbUserId(params: { supabase: any; workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data?.id ? String(byOrg.data.id) : null;
}
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

        const { workspaceId } = await getWorkspaceOrThrow(request);

        if (!clerkUser.email) {
            return NextResponse.json({
                connected: false
            });
        }

        let sb: any;
        try {
            sb = createClient();
        } catch {
            return NextResponse.json({
                connected: false
            });
        }

        const dbUserId = await selectDbUserId({ supabase: sb, workspaceId: String(workspaceId), email: clerkUser.email });
        if (!dbUserId) {
            return NextResponse.json({ connected: false });
        }

        // 3. Check if integration exists
        let query = sb
            .from('misrad_integrations')
            .select('id, is_active, last_synced_at, metadata')
            .eq('user_id', dbUserId)
            .eq('organization_id', workspaceId)
            .eq('service_type', 'green_invoice')
            .eq('is_active', true);

        let integration: any = null;
        let error: any = null;
        ({ data: integration, error } = await query.single());
        if (error?.code === '42703') {
            return NextResponse.json({ error: '[SchemaMismatch] misrad_integrations is missing organization_id' }, { status: 500 });
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
        if (error instanceof APIError) {
            return NextResponse.json({ connected: false }, { status: error.status });
        }
        return NextResponse.json({
            connected: false
        });
    }
}


export const GET = shabbatGuard(GETHandler);
