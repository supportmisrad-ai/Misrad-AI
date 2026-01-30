/**
 * API Route: Deactivate Employee Invitation Link
 * POST /api/employees/invitations/[id]/deactivate
 * 
 * Deactivates an employee invitation link
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth';
import { createClient } from '../../../../../../lib/supabase';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function loadUserInWorkspaceByEmail(params: { supabase: any; workspaceId: string; email: string }) {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const byOrg = await params.supabase
        .from('nexus_users')
        .select('id, role, is_super_admin')
        .eq('email', email)
        .eq('organization_id', params.workspaceId)
        .limit(1)
        .maybeSingle();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_users is missing organization_id');
    }

    return byOrg.data
        ? { id: String(byOrg.data.id), role: String(byOrg.data.role || 'עובד'), isSuperAdmin: Boolean((byOrg.data as any).is_super_admin) }
        : null;
}

async function loadInvitationInWorkspace(params: { supabase: any; workspaceId: string; invitationId: string }) {
    const byOrg = await params.supabase
        .from('nexus_employee_invitation_links')
        .select('*')
        .eq('id', params.invitationId)
        .eq('organization_id', params.workspaceId)
        .single();

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_employee_invitation_links is missing organization_id');
    }

    return byOrg;
}

async function deactivateInvitationInWorkspace(params: { supabase: any; workspaceId: string; invitationId: string }) {
    const patch = {
        is_active: false,
        updated_at: new Date().toISOString(),
    };

    const byOrg = await params.supabase
        .from('nexus_employee_invitation_links')
        .update(patch)
        .eq('id', params.invitationId)
        .eq('organization_id', params.workspaceId);

    if ((byOrg as any)?.error?.code === '42703') {
        throw new Error('[SchemaMismatch] nexus_employee_invitation_links is missing organization_id');
    }

    return byOrg;
}
async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        let supabase: any;
        try {
            supabase = createClient();
        } catch {
            return apiError('Database not configured', { status: 500 });
        }

        // 1. Authenticate user
        let clerkUser;
        try {
            clerkUser = await getAuthenticatedUser();
        } catch (authError: any) {
            return apiError('Unauthorized', { status: 401 });
        }

        if (!clerkUser.email) {
            return apiError('User email not found', { status: 400 });
        }

        // 2. Find user in database by email
        const user = await loadUserInWorkspaceByEmail({ supabase, workspaceId: workspace.id, email: clerkUser.email });

        if (!user) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        const { id } = await params;

        // 3. Check if invitation exists and get it
        const invRes = await loadInvitationInWorkspace({ supabase, workspaceId: workspace.id, invitationId: id });
        const invitation = (invRes as any)?.data;
        const getError = (invRes as any)?.error;

        if (getError || !invitation) {
            return apiError('קישור הזמנה לא נמצא', { status: 404 });
        }

        // 4. Check permissions: user can deactivate their own invitations, admins can deactivate any
        const isAdmin = user.isSuperAdmin || isTenantAdminRole(user.role);

        const ws = workspace;
        const flags = await getSystemFeatureFlags();

        let seatsAllowedOverride: number | null = null;
        try {
            const orgId = String(workspace.id || '');
            if (orgId) {
                const { data: orgSeatsRow, error: orgSeatsError } = await supabase
                    .from('organizations')
                    .select('seats_allowed')
                    .eq('id', orgId)
                    .maybeSingle();

                if (!orgSeatsError) {
                    seatsAllowedOverride = (orgSeatsRow as any)?.seats_allowed ?? null;
                }

                if (orgSeatsError?.message) {
                    const msg = String(orgSeatsError.message).toLowerCase();
                    if (msg.includes('column') && msg.includes('seats_allowed')) {
                        seatsAllowedOverride = null;
                    }
                }
            }
        } catch {
            seatsAllowedOverride = null;
        }

        const caps = computeWorkspaceCapabilities({
            entitlements: (ws as any)?.entitlements,
            fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
            seatsAllowedOverride,
        });

        if (!caps.isTeamManagementEnabled) {
            return apiError('ניהול צוות זמין רק עם מודול Nexus', { status: 403 });
        }

        const isOwner = invitation.created_by === user.id;

        if (!isAdmin && !isOwner) {
            return apiError('אין הרשאה לבטל קישור זה', { status: 403 });
        }

        // 5. Deactivate invitation
        const updateRes = await deactivateInvitationInWorkspace({ supabase, workspaceId: workspace.id, invitationId: id });
        const updateError = (updateRes as any)?.error;
        
        if (updateError) {
            console.error('[API] Error deactivating employee invitation:', updateError);
            return apiError('שגיאה בביטול קישור הזמנה', { status: 500 });
        }

        return apiSuccess({
            message: 'קישור הזמנה בוטל בהצלחה'
        });

    } catch (error: any) {
        console.error('[API] Error deactivating invitation:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        return apiError(error, { status: 500, message: error.message || 'Failed to deactivate invitation' });
    }
}


export const POST = shabbatGuard(POSTHandler);
