/**
 * API Route: Complete Invitation Form
 * POST /api/invitations/complete/[token]
 * 
 * Submits the invitation form and marks the link as used
 */

import { NextRequest } from 'next/server';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { MisradNotificationType } from '@prisma/client';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectTenantAdminIdsInWorkspace(params: { workspaceId: string }): Promise<string[]> {
    const roles = ['מנכ״ל', 'מנכ"ל', 'מנכל', 'אדמין'];

    const users = await prisma.nexusUser.findMany({
        where: {
            organizationId: params.workspaceId,
            OR: [{ isSuperAdmin: true }, { role: { in: roles } }],
        },
        select: { id: true },
        take: 200,
    });

    return (users || []).map((u) => String(u.id));
}
async function POSTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
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

        // Get invitation link
        const invitation = await prisma.system_invitation_links.findUnique({
            where: { token: String(token) },
        });

        if (!invitation) {
            return apiError('קישור לא נמצא', { status: 404 });
        }

        // Validate invitation
        if (invitation.is_used) {
            return apiError('קישור זה כבר שימש ואינו זמין לשימוש חוזר', { status: 410 });
        }

        if (!invitation.is_active) {
            return apiError('קישור זה אינו פעיל', { status: 403 });
        }

        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at as any);
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
            used_at: new Date(),
            updated_at: new Date(),
        };

        // Add company ID (ח.פ./ע.מ.) if provided - store in metadata
        const existingMetadata = invitation?.metadata && typeof invitation.metadata === 'object' ? invitation.metadata : {};
        updateData.metadata = companyId
            ? ({
                ...(existingMetadata as any),
                companyId: String(companyId),
              } as any)
            : (existingMetadata as any);

        const updatedInvitation = await prisma.system_invitation_links.update({
            where: { id: String(invitation.id) },
            data: updateData,
        });

        // If there's a client_id, update the client with the new information
        if (invitation.client_id) {
            try {
                const organizationIdFromMetadata =
                    invitation.metadata && typeof invitation.metadata === 'object' ? (invitation.metadata as any).organizationId : null;

                let organizationId: string | null =
                    typeof organizationIdFromMetadata === 'string' && organizationIdFromMetadata.length > 0 ? organizationIdFromMetadata : null;

                if (!organizationId) {
                    const clientOrgRow = await prisma.nexusClient.findUnique({
                        where: { id: String(invitation.client_id) },
                        select: { organizationId: true },
                    });
                    if (clientOrgRow?.organizationId) organizationId = String(clientOrgRow.organizationId);
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

                if (organizationId) {
                    await prisma.nexusClient.updateMany({
                        where: {
                            id: String(invitation.client_id),
                            organizationId: String(organizationId),
                        },
                        data: clientUpdateData,
                    });
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
                invitation?.metadata && typeof invitation.metadata === 'object' ? (invitation.metadata as any).organizationId : null;

            let organizationId: string | null =
                typeof organizationIdFromMetadata === 'string' && organizationIdFromMetadata.length > 0 ? organizationIdFromMetadata : null;

            if (!organizationId && invitation.client_id) {
                const clientOrg = await prisma.nexusClient.findUnique({
                    where: { id: String(invitation.client_id) },
                    select: { organizationId: true },
                });
                if (clientOrg?.organizationId) organizationId = String(clientOrg.organizationId);
            }

            if (!organizationId) {
                return apiSuccess(
                    {
                        message: 'הטופס נשלח בהצלחה',
                        invitation: {
                            id: updatedInvitation.id,
                            token: updatedInvitation.token,
                            usedAt: (updatedInvitation as any).used_at,
                        },
                    },
                    { status: 200 }
                );
            }

            const adminIds = await selectTenantAdminIdsInWorkspace({ workspaceId: String(organizationId) });
            
            if (adminIds.length > 0) {
                // Try to create notifications in notifications table (if exists)
                // Otherwise, we'll log it and admins can see it in the invitation links panel
                const notificationText = `טופס הזמנה הושלם: ${companyName} (${ceoName} - ${ceoEmail})`;
                
                // Try to insert into notifications table (gracefully handle if table doesn't exist)
                try {
                    await prisma.misradNotification.createMany({
                        data: adminIds.map((adminId: string) => ({
                            organization_id: String(organizationId),
                            recipient_id: String(adminId),
                            type: MisradNotificationType.SUCCESS,
                            title: 'טופס הזמנה הושלם',
                            message: notificationText,
                            timestamp: new Date().toISOString(),
                            isRead: false,
                            client_id: invitation.client_id ? String(invitation.client_id) : null,
                            link: null,
                        })),
                    });
                } catch (notifError: any) {
                    // Only ignore if table doesn't exist
                    const msg = String(notifError?.message || '');
                    const code = String(notifError?.code || '');
                    if (code === 'P2021' || msg.toLowerCase().includes('does not exist')) {
                        console.log('[API] Could not create notifications (table may not exist):', msg);
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
