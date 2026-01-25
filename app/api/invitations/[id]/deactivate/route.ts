/**
 * API Route: Deactivate Invitation Link
 * POST /api/invitations/[id]/deactivate
 * 
 * Deactivates an invitation link
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../../lib/auth';
import { getUsers } from '../../../../../lib/db';
import { supabase } from '../../../../../lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
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
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        try {
            await requireSuperAdmin();
        } catch (e: any) {
            return NextResponse.json(
                { error: e?.message || 'Forbidden - Super Admin required' },
                { status: 403 }
            );
        }

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        const orgHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeader);

        // 2. Find user in database by email
        const dbUsers = await getUsers({ email: clerkUser.email, tenantId: workspace.id });
        const user = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }

        // Super admin already validated above

        const { id } = await params;

        // 3. Deactivate invitation (use Supabase directly since updateRecord doesn't support invitation_links)
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const supabaseClient = supabase;

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
            const byTenant = await supabaseClient
                .from('system_invitation_links')
                .update(patch)
                .eq('id', id)
                .eq('tenant_id', workspace.id);
            updateError = (byTenant as any)?.error;
            if (updateError?.code === '42703') {
                return NextResponse.json({ success: true, message: 'Invitation link deactivated' });
            }
            updateError = (byTenant as any).error;
        }
        
        if (updateError) {
            console.error('[API] Error deactivating invitation:', updateError);
            return NextResponse.json(
                { error: 'Failed to deactivate invitation' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Invitation link deactivated'
        });

    } catch (error: any) {
        console.error('[API] Error deactivating invitation:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to deactivate invitation' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
