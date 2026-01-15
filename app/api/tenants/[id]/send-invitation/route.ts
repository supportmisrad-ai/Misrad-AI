/**
 * API Route: Send Tenant Invitation Email
 * POST /api/tenants/[id]/send-invitation
 * 
 * Sends an invitation email to the tenant owner with a link to register
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { supabase } from '../../../../../lib/supabase';
import { sendTenantInvitationEmail } from '../../../../../lib/email';
import { getBaseUrl } from '../../../../../lib/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authenticate user
        const user = await getAuthenticatedUser();
        
        // 2. Check permissions - only super admins can send invitations
        if (!user.isSuperAdmin) {
            return NextResponse.json(
                { error: 'Forbidden - Only super admins can send tenant invitations' },
                { status: 403 }
            );
        }

        // 3. Get tenant ID
        const { id: tenantId } = await params;

        if (!tenantId) {
            return NextResponse.json(
                { error: 'Tenant ID is required' },
                { status: 400 }
            );
        }

        // 4. Get tenant from database
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { data: tenants, error: getError } = await supabase
            .from('nexus_tenants')
            .select('*')
            .eq('id', tenantId)
            .limit(1);

        if (getError) {
            console.error('[API] Error fetching tenant:', getError);
            return NextResponse.json(
                { error: 'שגיאה בטעינת Tenant' },
                { status: 500 }
            );
        }

        if (!tenants || tenants.length === 0) {
            return NextResponse.json(
                { error: 'Tenant לא נמצא' },
                { status: 404 }
            );
        }

        const tenant = tenants[0] as any;
        const ownerEmail = tenant.owner_email || tenant.ownerEmail;

        if (!ownerEmail) {
            return NextResponse.json(
                { error: 'Tenant אין אימייל בעלים' },
                { status: 400 }
            );
        }

        // 5. Generate signup URL
        const baseUrl = getBaseUrl(request);
        
        // Create signup link with tenant info
        const signupUrl = `${baseUrl}/sign-up?email=${encodeURIComponent(ownerEmail)}&tenant=${encodeURIComponent(tenantId)}&invited=true`;

        // 6. Send email via Resend
        const emailResult = await sendTenantInvitationEmail(
            ownerEmail,
            tenant.name,
            signupUrl,
            {
                ownerName: null, // Can be extracted from tenant metadata if available
                subdomain: tenant.subdomain
            }
        );

        if (!emailResult.success) {
            console.error('[Tenant Invitation] Failed to send email:', emailResult.error);
            // Don't fail the request, but log the error
            // Return the signup URL so admin can send manually if needed
        } else {
            console.log('[Tenant Invitation] Email sent successfully:', {
                tenantId,
                tenantName: tenant.name,
                ownerEmail,
                signupUrl,
                sentBy: user.email
            });
        }

        // 7. Update tenant metadata to track invitation sent
        try {
            const metadata = tenant.metadata || {};
            metadata.invitationSent = true;
            metadata.invitationSentAt = new Date().toISOString();
            metadata.invitationSentBy = user.id;

            await supabase
                .from('nexus_tenants')
                .update({ metadata })
                .eq('id', tenantId);
        } catch (updateError) {
            console.error('[API] Error updating tenant metadata:', updateError);
            // Don't fail the request if metadata update fails
        }

        return NextResponse.json({
            success: true,
            message: 'הזמנה נשלחה בהצלחה',
            signupUrl, // Return URL for testing/manual sending
            tenant: {
                id: tenant.id,
                name: tenant.name,
                ownerEmail
            }
        });

    } catch (error: any) {
        console.error('[API] Error sending tenant invitation:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בשליחת ההזמנה' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}

export const POST = shabbatGuard(POSTHandler);
