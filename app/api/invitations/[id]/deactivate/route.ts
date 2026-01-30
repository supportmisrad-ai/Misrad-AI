/**
 * API Route: Deactivate Invitation Link
 * POST /api/invitations/[id]/deactivate
 * 
 * Deactivates an invitation link
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../../lib/auth';
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
async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const patch = {
            is_active: false,
            updated_at: new Date().toISOString()
        };

        const byOrg = await supabaseClient
            .from('system_invitation_links')
            .update(patch)
            .eq('id', id)
            .eq('organization_id', workspace.id);

        let updateError = (byOrg as any)?.error;
        if (updateError?.code === '42703') {
            return apiError('[SchemaMismatch] system_invitation_links is missing organization_id', { status: 500 });
        }
        
        if (updateError) {
            console.error('[API] Error deactivating invitation:', updateError);
            return apiError('Failed to deactivate invitation', { status: 500 });
        }

        return apiSuccess({ message: 'Invitation link deactivated' });

    } catch (error: any) {
        console.error('[API] Error deactivating invitation:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'Failed to deactivate invitation' });
    }
}


export const POST = shabbatGuard(POSTHandler);
