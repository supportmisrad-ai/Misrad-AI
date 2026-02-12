import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
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
import { MisradNotificationType, Prisma } from '@prisma/client';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

const IS_PROD = process.env.NODE_ENV === 'production';

function isSchemaMismatchError(error: unknown): boolean {
    const obj = asObject(error) ?? {};
    const code = typeof obj.code === 'string' ? String(obj.code).toUpperCase() : '';
    const msg = String(getUnknownErrorMessage(error) || '').toLowerCase();
    return (
        code === 'P2021' ||
        code === 'P2022' ||
        code === '42P01' ||
        code === '42703' ||
        msg.includes('does not exist') ||
        msg.includes('relation') ||
        msg.includes('column') ||
        msg.includes('could not find the table') ||
        msg.includes('schema cache')
    );
}

type SystemInvitationUpdateData = Parameters<typeof prisma.system_invitation_links.update>[0]['data'];
type NexusClientUpdateManyData = Parameters<typeof prisma.nexusClient.updateMany>[0]['data'];


function getStringField(obj: Record<string, unknown>, key: string): string {
    const v = obj[key];
    return typeof v === 'string' ? v : '';
}

function getNullableStringField(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    const s = typeof v === 'string' ? v : String(v);
    const trimmed = s.trim();
    return trimmed ? trimmed : null;
}

function toJsonObject(value: unknown): Prisma.InputJsonObject {
    const normalized: unknown = JSON.parse(JSON.stringify(value ?? {}));
    return (asObject(normalized) ?? {}) as Prisma.InputJsonObject;
}

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
    { params }: { params: { token: string } }
) {
    try {
        const { token } = params;

        if (!token || token === 'undefined' || token === 'null') {
            return apiError('קישור לא תקין', { status: 400 });
        }

        const ip = getClientIpFromRequest(request);
        const rl = await rateLimit({
            namespace: 'invitation-complete',
            key: `${ip}:${String(token)}`,
            limit: 10,
            windowMs: 10 * 60 * 1000,
            mode: 'degraded',
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
            const expiresAt = invitation.expires_at instanceof Date ? invitation.expires_at : new Date(String(invitation.expires_at));
            const now = new Date();
            if (now > expiresAt) {
                return apiError('קישור זה פג תוקף', { status: 410 });
            }
        }

        // Parse form data
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};

        const ceoName = getStringField(bodyObj, 'ceoName').trim();
        const ceoEmail = getStringField(bodyObj, 'ceoEmail').trim();
        const ceoPhone = getNullableStringField(bodyObj, 'ceoPhone');
        const companyName = getStringField(bodyObj, 'companyName').trim();
        const companyId = getNullableStringField(bodyObj, 'companyId');
        const companyLogo = getNullableStringField(bodyObj, 'companyLogo');
        const companyAddress = getNullableStringField(bodyObj, 'companyAddress');
        const companyWebsite = getNullableStringField(bodyObj, 'companyWebsite');
        const additionalNotes = getNullableStringField(bodyObj, 'additionalNotes');

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
        const updateData: SystemInvitationUpdateData = {
            ceo_name: ceoName,
            ceo_email: ceoEmail,
            ceo_phone: ceoPhone,
            company_name: companyName,
            company_logo: companyLogo,
            company_address: companyAddress,
            company_website: companyWebsite,
            additional_notes: additionalNotes,
            is_used: true,
            used_at: new Date(),
            updated_at: new Date(),
        };

        // Add company ID (ח.פ./ע.מ.) if provided - store in metadata
        const existingMetadata = asObject(invitation?.metadata) ?? {};
        const nextMetadata = companyId ? { ...existingMetadata, companyId: String(companyId) } : existingMetadata;
        updateData.metadata = toJsonObject(nextMetadata);

        const updatedInvitation = await prisma.system_invitation_links.update({
            where: { id: String(invitation.id) },
            data: updateData,
        });

        // If there's a client_id, update the client with the new information
        if (invitation.client_id) {
            try {
                const organizationIdFromMetadata = asObject(invitation.metadata)?.organizationId ?? null;

                let organizationId: string | null =
                    typeof organizationIdFromMetadata === 'string' && organizationIdFromMetadata.length > 0 ? organizationIdFromMetadata : null;

                if (!organizationId) {
                    const clientOrgRow = await prisma.nexusClient.findUnique({
                        where: { id: String(invitation.client_id) },
                        select: { organizationId: true },
                    });
                    if (clientOrgRow?.organizationId) organizationId = String(clientOrgRow.organizationId);
                }

                const clientUpdateData: NexusClientUpdateManyData = {
                    name: ceoName,
                    email: ceoEmail,
                    companyName: companyName
                };

                if (ceoPhone) {
                    clientUpdateData.phone = ceoPhone;
                }

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
            } catch (clientError: unknown) {
                const msg = getUnknownErrorMessage(clientError);
                if (!ALLOW_SCHEMA_FALLBACKS && isSchemaMismatchError(clientError)) {
                    throw new Error(`[SchemaMismatch] nexusClient update failed (${msg || 'missing relation'})`);
                }
                if (ALLOW_SCHEMA_FALLBACKS && isSchemaMismatchError(clientError)) {
                    reportSchemaFallback({
                        source: 'api/invitations/complete/[token]',
                        reason: 'nexusClient update failed (ignored)',
                        error: clientError,
                        extras: { clientId: invitation.client_id },
                    });
                }
                if (IS_PROD) console.error('[API] Error updating client (ignored)');
                else console.error('[API] Error updating client:', clientError);
                // Don't fail the request if client update fails
            }
        }

        // Send notification to all super admins
        // Try to create a system task or notification for admins
        let notificationOrganizationId: string | null = null;
        try {
            const organizationIdFromMetadata = asObject(invitation?.metadata)?.organizationId ?? null;

            notificationOrganizationId =
                typeof organizationIdFromMetadata === 'string' && organizationIdFromMetadata.length > 0 ? organizationIdFromMetadata : null;

            if (!notificationOrganizationId && invitation.client_id) {
                const clientOrg = await prisma.nexusClient.findUnique({
                    where: { id: String(invitation.client_id) },
                    select: { organizationId: true },
                });
                if (clientOrg?.organizationId) notificationOrganizationId = String(clientOrg.organizationId);
            }

            if (!notificationOrganizationId) {
                return apiSuccess(
                    {
                        message: 'הטופס נשלח בהצלחה',
                        invitation: {
                            id: updatedInvitation.id,
                            token: updatedInvitation.token,
                            usedAt: updatedInvitation.used_at,
                        },
                    },
                    { status: 200 }
                );
            }

            const adminIds = await selectTenantAdminIdsInWorkspace({ workspaceId: String(notificationOrganizationId) });
            
            if (adminIds.length > 0) {
                // Try to create notifications in notifications table (if exists)
                // Otherwise, we'll log it and admins can see it in the invitation links panel
                const notificationText = `טופס הזמנה הושלם: ${companyName} (${ceoName} - ${ceoEmail})`;
                
                // Try to insert into notifications table (gracefully handle if table doesn't exist)
                try {
                    const now = new Date();
                    const nowIso = now.toISOString();
                    try {
                        await prisma.misradNotification.createMany({
                            data: adminIds.map((adminId: string) => ({
                                organization_id: String(notificationOrganizationId),
                                recipient_id: String(adminId),
                                type: MisradNotificationType.SUCCESS,
                                title: 'טופס הזמנה הושלם',
                                message: notificationText,
                                timestamp: nowIso,
                                timestampAt: now,
                                isRead: false,
                                client_id: invitation.client_id ? String(invitation.client_id) : null,
                                link: null,
                            })) as unknown as Prisma.MisradNotificationCreateManyInput[],
                        });
                    } catch {
                        await prisma.misradNotification.createMany({
                            data: adminIds.map((adminId: string) => ({
                                organization_id: String(notificationOrganizationId),
                                recipient_id: String(adminId),
                                type: MisradNotificationType.SUCCESS,
                                title: 'טופס הזמנה הושלם',
                                message: notificationText,
                                timestamp: nowIso,
                                isRead: false,
                                client_id: invitation.client_id ? String(invitation.client_id) : null,
                                link: null,
                            })),
                        });
                    }
                } catch (notifError: unknown) {
                    // Only ignore if table doesn't exist
                    const msg = getUnknownErrorMessage(notifError);
                    const code = typeof asObject(notifError)?.code === 'string' ? String(asObject(notifError)?.code) : '';
                    if (code === 'P2021' || msg.toLowerCase().includes('does not exist')) {
                        if (!ALLOW_SCHEMA_FALLBACKS) {
                            throw new Error(`[SchemaMismatch] misrad_notifications missing table (${msg || code || 'missing relation'})`);
                        }
                        reportSchemaFallback({
                            source: 'app/api/invitations/complete/[token].POSTHandler',
                            reason: 'misrad_notifications missing table/column (fallback to ignore notification insert)',
                            error: notifError,
                            extras: {
                                organizationId: String(notificationOrganizationId || ''),
                                adminCount: Array.isArray(adminIds) ? adminIds.length : null,
                            },
                        });
                        if (!IS_PROD) console.log('[API] Could not create notifications (table may not exist):', msg);
                    } else {
                        throw notifError;
                    }
                }
                
                // Log for admin visibility
                if (!IS_PROD) {
                    console.log('[API] Invitation completed - Admin notification:', {
                        admins: adminIds.map((id: string) => ({ id })),
                        companyName,
                        ceoName,
                        ceoEmail: ceoEmail ? '[redacted]' : null,
                        token: token ? '[redacted]' : null
                    });
                }
            }
        } catch (notifError: unknown) {
            const msg = getUnknownErrorMessage(notifError);
            if (!ALLOW_SCHEMA_FALLBACKS && (String(msg || '').includes('[SchemaMismatch]') || isSchemaMismatchError(notifError))) {
                throw notifError;
            }
            if (ALLOW_SCHEMA_FALLBACKS && isSchemaMismatchError(notifError)) {
                reportSchemaFallback({
                    source: 'app/api/invitations/complete/[token].POSTHandler',
                    reason: 'admin notifications schema mismatch (fallback to ignore notification failure)',
                    error: notifError,
                    extras: {
                        organizationId: String(notificationOrganizationId || ''),
                    },
                });
            }
            if (IS_PROD) console.error('[API] Error processing admin notifications (ignored)');
            else console.error('[API] Error processing admin notifications:', notifError);
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

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error completing invitation');
        else console.error('[API] Error completing invitation:', error);
        return apiError(error, {
            status: 500,
            message: getUnknownErrorMessage(error) || 'שגיאה בשליחת הטופס. אנא נסה שוב מאוחר יותר.',
        });
    }
}


export const POST = shabbatGuard(POSTHandler);
