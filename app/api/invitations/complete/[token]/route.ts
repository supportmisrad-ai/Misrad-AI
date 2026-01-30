/**
 * API Route: Complete Invitation Form
 * POST /api/invitations/complete/[token]
 * 
 * Submits the invitation form and marks the link as used
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { safeWritePayload } from '@/lib/tenant-isolation';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectTenantAdminIdsInWorkspace(params: { supabase: any; workspaceId: string }): Promise<string[]> {
    const roles = ['מנכ״ל', 'מנכ"ל', 'מנכל', 'אדמין'];

    const superAdminsRes = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('organization_id', params.workspaceId)
        .eq('is_super_admin', true);

    const rolesRes = await params.supabase
        .from('nexus_users')
        .select('id')
        .eq('organization_id', params.workspaceId)
        .in('role', roles);

    const ids = new Set<string>();
    for (const row of Array.isArray(superAdminsRes.data) ? superAdminsRes.data : []) {
        if (row?.id) ids.add(String(row.id));
    }
    for (const row of Array.isArray(rolesRes.data) ? rolesRes.data : []) {
        if (row?.id) ids.add(String(row.id));
    }
    return Array.from(ids);
}
async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        let supabase: any;
        try {
            supabase = createClient();
        } catch {
            return apiError('Database not configured', { status: 500 });
        }

        const { token } = await params;

        if (!token || token === 'undefined' || token === 'null') {
            return apiError('קישור לא תקין', { status: 400 });
        }

        const ip = getClientIpFromRequest(request);
        const rl = await rateLimit({
            namespace: 'invitation-complete',
            key: `${ip}:${String(token)}`,
            limit: 10,
            windowMs: 10 * 60 * 1000,
        });
        if (!rl.ok) {
            return apiError('Too many requests', {
                status: 429,
                headers: {
                    'Retry-After': String(rl.retryAfterSeconds),
                },
            });
        }

        // Get invitation link - use maybeSingle to avoid coercion error
        const { data: invitations, error: getError } = await supabase
            .from('system_invitation_links')
            .select('*')
            .eq('token', token)
            .limit(1);

        if (getError) {
            console.error('[API] Error fetching invitation:', getError);
            return apiError('שגיאה בטעינת הקישור', { status: 500 });
        }

        if (!invitations || invitations.length === 0) {
            return apiError('קישור לא נמצא', { status: 404 });
        }

        const invitation = invitations[0];

        // Validate invitation
        if (invitation.is_used) {
            return apiError('קישור זה כבר שימש ואינו זמין לשימוש חוזר', { status: 410 });
        }

        if (!invitation.is_active) {
            return apiError('קישור זה אינו פעיל', { status: 403 });
        }

        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at);
            const now = new Date();
            if (now > expiresAt) {
                return apiError('קישור זה פג תוקף', { status: 410 });
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
            return apiError('נא למלא את כל השדות החובה: שם מנכ"ל, אימייל ושם החברה', { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ceoEmail)) {
            return apiError('כתובת אימייל לא תקינה', { status: 400 });
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
            return apiError('שגיאה בעדכון הקישור', { status: 500 });
        }

        if (!updatedInvitations || updatedInvitations.length === 0) {
            return apiError('לא נמצא קישור לעדכון', { status: 404 });
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
                    company_name: companyName
                };

                // Update client logo if provided
                if (companyLogo) {
                    clientUpdateData.avatar = companyLogo;
                }

                if (organizationId) {
                    const byOrgUpdate = await supabase
                        .from('nexus_clients')
                        .update(clientUpdateData)
                        .eq('id', invitation.client_id)
                        .eq('organization_id', String(organizationId));

                    if ((byOrgUpdate as any)?.error?.code === '42703') {
                        throw new Error('[SchemaMismatch] nexus_clients is missing organization_id');
                    }
                }
            } catch (clientError) {
                console.error('[API] Error updating client:', clientError);
                // Don't fail the request if client update fails
            }
        }

        // Send notification to all super admins
        // Try to create a system task or notification for admins
        try {
            const organizationIdFromMetadata =
                invitation?.metadata && typeof invitation.metadata === 'object'
                    ? (invitation.metadata as any).organizationId
                    : null;

            const organizationId =
                typeof organizationIdFromMetadata === 'string' && organizationIdFromMetadata.length > 0
                    ? organizationIdFromMetadata
                    : (invitation as any).organization_id || null;

            if (!organizationId) {
                return apiSuccess({
                    message: 'הטופס נשלח בהצלחה',
                    invitation: {
                        id: updatedInvitation.id,
                        token: updatedInvitation.token,
                        usedAt: updatedInvitation.used_at
                    }
                }, { status: 200 });
            }

            const adminIds = await selectTenantAdminIdsInWorkspace({ supabase, workspaceId: String(organizationId) });
            
            if (adminIds.length > 0) {
                // Try to create notifications in notifications table (if exists)
                // Otherwise, we'll log it and admins can see it in the invitation links panel
                const notificationText = `🎉 טופס הזמנה הושלם: ${companyName} (${ceoName} - ${ceoEmail})`;
                
                // Try to insert into notifications table (gracefully handle if table doesn't exist)
                try {
                    const safeNotifications = adminIds.map((adminId: string) =>
                        safeWritePayload({
                            context: 'api.invitations.complete',
                            table: 'misrad_notifications',
                            mode: 'insert',
                            organizationId: String(organizationId),
                            payload: {
                                organization_id: String(organizationId),
                                recipient_id: adminId,
                                type: 'system',
                                text: notificationText,
                                is_read: false,
                                created_at: new Date().toISOString(),
                                metadata: {
                                    invitationId: invitation.id,
                                    companyName,
                                    ceoName,
                                    ceoEmail,
                                    token: token
                                }
                            } as any,
                        })
                    );

                    const { error: notifError } = await supabase.from('misrad_notifications').insert(
                        safeNotifications
                    );
                    
                    if (notifError) {
                        if (notifError.code !== '42P01' && !String(notifError.message || '').includes('does not exist')) {
                            throw new Error(`[SchemaMismatch] misrad_notifications insert failed: ${notifError.message}`);
                        }
                    }
                } catch (notifError: any) {
                    // Only ignore if table doesn't exist
                    if (String(notifError?.message || '').includes('42P01') || String(notifError?.message || '').includes('does not exist')) {
                        console.log('[API] Could not create notifications (table may not exist):', notifError.message);
                    } else {
                        throw notifError;
                    }
                }
                
                // Log for admin visibility
                console.log('[API] Invitation completed - Admin notification:', {
                    admins: adminIds.map((id: string) => ({ id })),
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

        return apiSuccess({
            message: 'הטופס נשלח בהצלחה',
            invitation: {
                id: updatedInvitation.id,
                token: updatedInvitation.token,
                usedAt: updatedInvitation.used_at
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('[API] Error completing invitation:', error);
        return apiError(error, {
            status: 500,
            message: error.message || 'שגיאה בשליחת הטופס. אנא נסה שוב מאוחר יותר.',
        });
    }
}


export const POST = shabbatGuard(POSTHandler);
