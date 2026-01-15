/**
 * API Route: Deactivate Employee Invitation Link
 * POST /api/employees/invitations/[id]/deactivate
 * 
 * Deactivates an employee invitation link
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../../lib/auth';
import { getUsers } from '../../../../../../lib/db';
import { supabase } from '../../../../../../lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';

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

        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // 2. Find user in database by email
        const dbUsers = await getUsers({ email: clerkUser.email });
        const user = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }

        const { id } = await params;

        // 3. Check if invitation exists and get it
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { data: invitation, error: getError } = await supabase
            .from('nexus_employee_invitation_links')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !invitation) {
            return NextResponse.json(
                { error: 'קישור הזמנה לא נמצא' },
                { status: 404 }
            );
        }

        // 4. Check permissions: user can deactivate their own invitations, admins can deactivate any
        const isAdmin = user.isSuperAdmin || 
                       user.role === 'מנכ״ל' || 
                       user.role === 'מנכ"ל' || 
                       user.role === 'אדמין';

        const ws = await requireWorkspaceAccessByOrgSlugApi(String((invitation as any)?.organization_id));
        const flags = await getSystemFeatureFlags();

        let seatsAllowedOverride: number | null = null;
        try {
            const orgId = String((invitation as any)?.organization_id || '');
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
            return NextResponse.json(
                { error: 'ניהול צוות זמין רק בחבילת משרד מלא' },
                { status: 403 }
            );
        }

        const isOwner = invitation.created_by === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json(
                { error: 'אין הרשאה לבטל קישור זה' },
                { status: 403 }
            );
        }

        // 5. Deactivate invitation
        const { error: updateError } = await supabase
            .from('nexus_employee_invitation_links')
            .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (updateError) {
            console.error('[API] Error deactivating employee invitation:', updateError);
            return NextResponse.json(
                { error: 'שגיאה בביטול קישור הזמנה' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'קישור הזמנה בוטל בהצלחה'
        });

    } catch (error: any) {
        console.error('[API] Error deactivating employee invitation:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בביטול קישור הזמנה' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
