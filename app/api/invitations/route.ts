/**
 * API Route: List Invitation Links
 * GET /api/invitations
 * 
 * Gets all invitation links (for admin panel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../lib/auth';
import { getUsers } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';
import { getBaseUrl } from '../../../lib/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(request: NextRequest) {
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

        // 2. Find user in database by email
        const dbUsers = await getUsers({ email: clerkUser.email });
        const user = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in database. Please sync your account first.' },
                { status: 404 }
            );
        }

        // Super admin already validated above

        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        // 3. Get all invitation links
        const { data: invitations, error } = await supabase
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

        if (error) {
            console.error('[API] Supabase error getting invitations:', error);
            // If table doesn't exist, return empty array instead of error
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.warn('[API] invitation_links table does not exist. Please run the schema SQL.');
                return NextResponse.json({
                    success: true,
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

        return NextResponse.json({
            success: true,
            invitations: invitationsWithUrls
        });

    } catch (error: any) {
        console.error('[API] Error getting invitations:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get invitations' },
            { status: 500 }
        );
    }
}


export const GET = shabbatGuard(GETHandler);
