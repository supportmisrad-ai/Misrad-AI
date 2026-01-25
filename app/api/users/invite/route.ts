/**
 * API Route: Send User Invitation Email
 * POST /api/users/invite
 * 
 * Sends an invitation email to a new user with a link to register
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../../lib/auth';
import { getUsers } from '../../../../lib/db';
import { getBaseUrl } from '../../../../lib/utils';
import { sendEmployeeInvitationEmail } from '../../../../lib/email';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();

        const orgHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');
        if (!orgHeader) {
            return NextResponse.json({ error: 'Missing x-org-id header' }, { status: 400 });
        }

        const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeader);
        
        // 2. Check permissions
        await requirePermission('manage_team');
        
        // 3. Parse request body
        const body = await request.json();
        const { email, userId, userName, department, role } = body;
        
        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        // 4. Get user info (invited user and current user)
        const dbUsers = await getUsers({ email: user.email, tenantId: workspace.id });
        const currentUser = dbUsers[0];
        if (!currentUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get invited user info if userId provided
        let invitedUser = null;
        if (userId) {
            const invitedUsers = await getUsers({ userId, tenantId: workspace.id });
            invitedUser = invitedUsers[0];
        }

        // 5. Generate invitation link
        const baseUrl = getBaseUrl(request);
        const signupUrl = `${baseUrl}/sign-up?email=${encodeURIComponent(email)}&invited=true`;
        
        // 6. Send email via Resend
        const emailResult = await sendEmployeeInvitationEmail(
            email,
            userName || invitedUser?.name || null,
            department || invitedUser?.department || 'כללי',
            role || invitedUser?.role || 'עובד',
            signupUrl,
            currentUser.name || null
        );

        if (!emailResult.success) {
            console.error('[Invitation] Failed to send email:', emailResult.error);
            // Don't fail the request, but log the error
            // Return the signup URL so admin can send manually if needed
        } else {
            console.log('[Invitation] Email sent successfully:', {
                tenantId: workspace.id,
                invitedUserId: userId || null,
                sentByUserId: user.id
            });
        }

        return NextResponse.json({
            success: true,
            message: emailResult.success ? 'Invitation sent successfully' : 'Invitation created but email failed',
            signupUrl, // Return URL for manual sending if needed
            emailSent: emailResult.success
        });
        
    } catch (error: any) {
        console.error('[API] Error in /api/users/invite:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}

export const POST = shabbatGuard(POSTHandler);
