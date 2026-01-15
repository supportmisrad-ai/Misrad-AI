/**
 * API Route: Complete Invitation Form
 * POST /api/invitations/complete/[token]
 * 
 * Submits the invitation form and marks the link as used
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { updateRecord, getUsers } from '../../../../../lib/db';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { token } = await params;

        if (!token || token === 'undefined' || token === 'null') {
            return NextResponse.json(
                { error: 'קישור לא תקין' },
                { status: 400 }
            );
        }

        const ip = getClientIpFromRequest(request);
        const rl = await rateLimit({
            namespace: 'invitation-complete',
            key: `${ip}:${String(token)}`,
            limit: 10,
            windowMs: 10 * 60 * 1000,
        });
        if (!rl.ok) {
            return NextResponse.json(
                { error: 'Too many requests' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rl.retryAfterSeconds),
                    },
                }
            );
        }

        // Get invitation link - use maybeSingle to avoid coercion error
        const { data: invitations, error: getError } = await supabase
            .from('system_invitation_links')
            .select('*')
            .eq('token', token)
            .limit(1);

        if (getError) {
            console.error('[API] Error fetching invitation:', getError);
            return NextResponse.json(
                { error: 'שגיאה בטעינת הקישור' },
                { status: 500 }
            );
        }

        if (!invitations || invitations.length === 0) {
            return NextResponse.json(
                { error: 'קישור לא נמצא' },
                { status: 404 }
            );
        }

        const invitation = invitations[0];

        // Validate invitation
        if (invitation.is_used) {
            return NextResponse.json(
                { error: 'קישור זה כבר שימש ואינו זמין לשימוש חוזר' },
                { status: 410 }
            );
        }

        if (!invitation.is_active) {
            return NextResponse.json(
                { error: 'קישור זה אינו פעיל' },
                { status: 403 }
            );
        }

        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at);
            const now = new Date();
            if (now > expiresAt) {
                return NextResponse.json(
                    { error: 'קישור זה פג תוקף' },
                    { status: 410 }
                );
            }
        }

        // Parse form data
        const body = await request.json();
        const {
            ceoName,
            ceoEmail,
            ceoPhone,
            companyName,
            companyId, // ח.פ./ע.מ.
            companyLogo, // Base64 or URL
            companyAddress,
            companyWebsite,
            additionalNotes
        } = body;

        // Validate required fields
        if (!ceoName || !ceoEmail || !companyName) {
            return NextResponse.json(
                { 
                    error: 'נא למלא את כל השדות החובה: שם מנכ"ל, אימייל ושם החברה'
                },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ceoEmail)) {
            return NextResponse.json(
                { error: 'כתובת אימייל לא תקינה' },
                { status: 400 }
            );
        }

        // Update invitation link with form data and mark as used
        const updateData: any = {
            ceo_name: ceoName,
            ceo_email: ceoEmail,
            ceo_phone: ceoPhone || null,
            company_name: companyName,
            company_logo: companyLogo || null,
            company_address: companyAddress || null,
            company_website: companyWebsite || null,
            additional_notes: additionalNotes || null,
            is_used: true,
            used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Add company ID (ח.פ./ע.מ.) if provided - store in metadata
        if (companyId) {
            // Store in metadata (since company_id column doesn't exist in table)
            const existingMetadata = (invitation.metadata && typeof invitation.metadata === 'object') 
                ? invitation.metadata 
                : {};
            updateData.metadata = {
                ...existingMetadata,
                companyId: companyId
            };
        } else if (invitation.metadata) {
            // Preserve existing metadata if no companyId provided
            updateData.metadata = invitation.metadata;
        } else {
            // Initialize empty metadata if none exists
            updateData.metadata = {};
        }

        // Update invitation link directly using Supabase (since updateRecord doesn't support invitation_links)
        const { data: updatedInvitations, error: updateError } = await supabase
            .from('system_invitation_links')
            .update(updateData)
            .eq('id', invitation.id)
            .select()
            .limit(1);

        if (updateError) {
            console.error('[API] Error updating invitation:', updateError);
            return NextResponse.json(
                { error: 'שגיאה בעדכון הקישור' },
                { status: 500 }
            );
        }

        if (!updatedInvitations || updatedInvitations.length === 0) {
            return NextResponse.json(
                { error: 'לא נמצא קישור לעדכון' },
                { status: 404 }
            );
        }

        const updatedInvitation = updatedInvitations[0];

        // If there's a client_id, update the client with the new information
        if (invitation.client_id) {
            try {
                const organizationIdFromMetadata =
                    invitation.metadata && typeof invitation.metadata === 'object'
                        ? (invitation.metadata as any).organizationId
                        : null;

                let organizationId: string | null =
                    typeof organizationIdFromMetadata === 'string' && organizationIdFromMetadata.length > 0
                        ? organizationIdFromMetadata
                        : null;

                if (!organizationId) {
                    const { data: clientOrgRow, error: clientOrgError } = await supabase
                        .from('nexus_clients')
                        .select('organization_id')
                        .eq('id', invitation.client_id)
                        .maybeSingle();

                    if (!clientOrgError && clientOrgRow?.organization_id) {
                        organizationId = String(clientOrgRow.organization_id);
                    }
                }

                const clientUpdateData: any = {
                    name: ceoName,
                    email: ceoEmail,
                    phone: ceoPhone || null,
                    companyName: companyName
                };

                // Update client logo if provided
                if (companyLogo) {
                    clientUpdateData.avatar = companyLogo;
                }

                await updateRecord('clients', invitation.client_id, clientUpdateData, {
                    organizationId: organizationId || undefined,
                });
            } catch (clientError) {
                console.error('[API] Error updating client:', clientError);
                // Don't fail the request if client update fails
            }
        }

        // Send notification to all super admins
        // Try to create a system task or notification for admins
        try {
            const superAdmins = await getUsers();
            const admins = superAdmins.filter(u => u.isSuperAdmin || u.role === 'מנכ״ל' || u.role === 'מנכ"ל' || u.role === 'אדמין');
            
            if (admins.length > 0) {
                // Try to create notifications in notifications table (if exists)
                // Otherwise, we'll log it and admins can see it in the invitation links panel
                const notificationText = `🎉 טופס הזמנה הושלם: ${companyName} (${ceoName} - ${ceoEmail})`;
                
                // Try to insert into notifications table (gracefully handle if table doesn't exist)
                try {
                    const { error: notifError } = await supabase.from('misrad_notifications').insert(
                        admins.map(admin => ({
                            recipient_id: admin.id,
                            type: 'system',
                            text: notificationText,
                            read: false,
                            created_at: new Date().toISOString(),
                            metadata: {
                                invitationId: invitation.id,
                                companyName,
                                ceoName,
                                ceoEmail,
                                token: token
                            }
                        }))
                    );
                    
                    if (notifError) {
                        // Table might not exist, log but don't fail
                        console.log('[API] Notifications table might not exist, skipping:', notifError.message);
                    }
                } catch (notifError: any) {
                    // Table doesn't exist or other error - that's OK
                    console.log('[API] Could not create notifications (table may not exist):', notifError.message);
                }
                
                // Log for admin visibility
                console.log('[API] Invitation completed - Admin notification:', {
                    admins: admins.map(a => ({ id: a.id, email: a.email })),
                    companyName,
                    ceoName,
                    ceoEmail,
                    token
                });
            }
        } catch (notifError) {
            console.error('[API] Error processing admin notifications:', notifError);
            // Don't fail the request if notifications fail
        }

        return NextResponse.json({
            success: true,
            message: 'הטופס נשלח בהצלחה',
            invitation: {
                id: updatedInvitation.id,
                token: updatedInvitation.token,
                usedAt: updatedInvitation.used_at
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error completing invitation:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בשליחת הטופס. אנא נסה שוב מאוחר יותר.' },
            { status: 500 }
        );
    }
}


export const POST = shabbatGuard(POSTHandler);
