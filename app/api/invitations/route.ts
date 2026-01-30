/**
 * API Route: List Invitation Links
 * GET /api/invitations
 * 
 * Gets all invitation links (for admin panel)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../lib/auth';
import { getBaseUrl } from '../../../lib/utils';
import { createClient } from '@/lib/supabase';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

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
            return apiError('Unauthorized', { status: 401 });
        }

        try {
            await requireSuperAdmin();
        } catch (e: any) {
            return apiError(e?.message || 'Forbidden - Super Admin required', { status: 403 });
        }

        if (!clerkUser.email) {
            return apiError('User email not found', { status: 400 });
        }

        const { workspace } = await getWorkspaceOrThrow(request);

        let supabaseClient: any;
        try {
            supabaseClient = createClient();
        } catch {
            return apiError('Database not configured', { status: 500 });
        }

        // 2. Find user in database by email
        const dbUserId = await selectDbUserId({ supabase: supabaseClient, workspaceId: workspace.id, email: clerkUser.email });

        if (!dbUserId) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        // Super admin already validated above

        // 3. Get all invitation links (scoped to workspace)
        const baseQuery = () => supabaseClient
            .from('system_invitation_links')
            .select(`
                id,
                token,
                client_id,
                created_at,
                expires_at,
                is_used,
                is_active,
                used_at,
                ceo_name,
                ceo_email,
                company_name,
                source,
                metadata
            `)
            .order('created_at', { ascending: false });

        const byOrg = await baseQuery().eq('organization_id', workspace.id);
        let invitations = (byOrg as any).data;
        let error = (byOrg as any).error;

        if (error?.code === '42703') {
            return apiError('[SchemaMismatch] system_invitation_links is missing organization_id', { status: 500 });
        }

        if (error) {
            console.error('[API] Supabase error getting invitations:', error);
            // If table doesn't exist, return empty array instead of error
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.warn('[API] invitation_links table does not exist. Please run the schema SQL.');
                return apiSuccess({
                    invitations: [],
                    warning: 'invitation_links table does not exist. Please run supabase-invitation-links-schema.sql'
                });
            }
            throw error;
        }

        // 4. Generate URLs for each invitation
        const baseUrl = getBaseUrl(request);

        const invitationsWithUrls = (invitations || []).map((invitation: any) => ({
            ...invitation,
            url: `${baseUrl}/invite/${invitation.token}`
        }));

        return apiSuccess({ invitations: invitationsWithUrls });

    } catch (error: any) {
        console.error('[API] Error getting invitations:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'Failed to get invitations' });
    }
}


export const GET = shabbatGuard(GETHandler);
