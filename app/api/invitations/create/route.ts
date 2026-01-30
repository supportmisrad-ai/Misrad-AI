/**
 * API Route: Create Invitation Link
 * POST /api/invitations/create
 * 
 * Creates a one-time invitation link for client onboarding
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../lib/auth';
import { generateInvitationToken, getBaseUrl } from '../../../../lib/utils';
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
async function POSTHandler(request: NextRequest) {
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

        const supabaseClient = createClient();

        // 2. Find user in database by email
        const dbUserId = await selectDbUserId({ supabase: supabaseClient, workspaceId: workspace.id, email: clerkUser.email });

        if (!dbUserId) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        // Super admin already validated above

        // 3. Parse request body
        const body = await request.json();
        const { 
            clientId, // Optional: if creating for specific client
            expiresInDays = 7, // Default expiration: 7 days (temporary link)
            source = 'manual' // 'manual' or 'automatic'
        } = body;

        // 4. Generate unique token
        const token = await generateInvitationToken();
        
        if (!token || token.trim() === '') {
            throw new Error('Failed to generate invitation token');
        }

        // 5. Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const invitationData = {
            organization_id: workspace.id,
            token,
            client_id: clientId || null,
            created_by: dbUserId,
            expires_at: expiresAt.toISOString(),
            is_used: false,
            is_active: true,
            source,
            metadata: {}
        };

        const byOrg = await supabaseClient
            .from('system_invitation_links')
            .insert(invitationData)
            .select()
            .single();

        let invitation = (byOrg as any).data;
        let createError = (byOrg as any).error;

        if (createError?.code === '42703') {
            return apiError('[SchemaMismatch] system_invitation_links is missing organization_id', { status: 500 });
        }

        if (createError) {
            console.error('[API] Error creating invitation link:', createError);
            return apiError(createError.message || 'Failed to create invitation link', { status: 500 });
        }

        if (!invitation) {
            return apiError('Failed to create invitation link', { status: 500 });
        }

        // 7. Generate invitation URL
        const baseUrl = getBaseUrl(request);
        const invitationUrl = `${baseUrl}/invite/${token}`;

        return apiSuccess({
            invitation: {
                id: invitation.id,
                token: invitation.token,
                url: invitationUrl,
                expiresAt: invitation.expires_at,
                createdAt: invitation.created_at
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error creating invitation link:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'Failed to create invitation link' });
    }
}


export const POST = shabbatGuard(POSTHandler);
