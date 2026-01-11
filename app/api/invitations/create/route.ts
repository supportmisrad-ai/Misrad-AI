/**
 * API Route: Create Invitation Link
 * POST /api/invitations/create
 * 
 * Creates a one-time invitation link for client onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireSuperAdmin } from '../../../../lib/auth';
import { getUsers } from '../../../../lib/db';
import { generateInvitationToken, getBaseUrl } from '../../../../lib/utils';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
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

        // 6. Create invitation link
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const invitationData = {
            token,
            client_id: clientId || null,
            created_by: user.id,
            expires_at: expiresAt.toISOString(),
            is_used: false,
            is_active: true,
            source,
            metadata: {}
        };

        const { data: invitation, error: createError } = await supabase
            .from('system_invitation_links')
            .insert(invitationData)
            .select()
            .single();

        if (createError) {
            console.error('[API] Error creating invitation link:', createError);
            return NextResponse.json(
                { error: createError.message || 'Failed to create invitation link' },
                { status: 500 }
            );
        }

        if (!invitation) {
            return NextResponse.json(
                { error: 'Failed to create invitation link' },
                { status: 500 }
            );
        }

        // 7. Generate invitation URL
        const baseUrl = getBaseUrl(request);
        const invitationUrl = `${baseUrl}/invite/${token}`;

        return NextResponse.json({
            success: true,
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
        return NextResponse.json(
            { error: error.message || 'Failed to create invitation link' },
            { status: 500 }
        );
    }
}

