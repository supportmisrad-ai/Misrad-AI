import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Get Invitation Link Details
 * GET /api/invitations/token/[token]
 * 
 * Gets invitation link details (for form page)
 */

import { NextRequest } from 'next/server';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';
import prisma from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(
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
            namespace: 'invitation-token',
            key: `${ip}:${String(token)}`,
            limit: 30,
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

        return await withTenantIsolationContext(
            { source: 'api_invitations_token', reason: 'read_invitation_link', suppressReporting: true },
            async () => {
        try {
            const invitation = await prisma.system_invitation_links.findUnique({
                where: { token: String(token) },
                select: {
                    id: true,
                    token: true,
                    client_id: true,
                    created_at: true,
                    expires_at: true,
                    is_used: true,
                    is_active: true,
                    used_at: true,
                    ceo_name: true,
                    ceo_email: true,
                    ceo_phone: true,
                    company_name: true,
                    company_logo: true,
                    company_address: true,
                    company_website: true,
                    additional_notes: true,
                    source: true,
                    metadata: true,
                },
            });
            if (!invitation) {
                return apiError('קישור לא נמצא', { status: 404 });
            }

            // Check if link is used FIRST - show completion message
            if (invitation.is_used) {
                return apiSuccess({
                    invitation: {
                        token,
                        isUsed: true,
                        completed: true,
                        usedAt: invitation.used_at,
                        companyName: invitation.company_name,
                        ceoName: invitation.ceo_name,
                        prefill: {
                            ceoName: '',
                            ceoEmail: '',
                            ceoPhone: '',
                            companyName: '',
                            companyId: '',
                            companyLogo: '',
                            companyAddress: '',
                            companyWebsite: '',
                            additionalNotes: '',
                        },
                    },
                });
            }

            // Check if link is expired
            if (invitation.expires_at) {
                const expiresAt = new Date(invitation.expires_at);
                const now = new Date();
                if (now > expiresAt) {
                    return apiError('קישור זה פג תוקף', { status: 410 });
                }
            }

            // Check if link is active
            if (!invitation.is_active) {
                return apiError('קישור זה אינו פעיל', { status: 403 });
            }

            const metadataObj = asObject(invitation.metadata);
            const companyIdFromMeta = typeof metadataObj?.companyId === 'string' ? metadataObj.companyId : '';

            // Return invitation details (without sensitive data)
            return apiSuccess({
                invitation: {
                    token: invitation.token,
                    expiresAt: invitation.expires_at,
                    isUsed: invitation.is_used,
                    // Pre-filled data if exists
                    prefill: {
                        ceoName: invitation.ceo_name || '',
                        ceoEmail: invitation.ceo_email || '',
                        ceoPhone: invitation.ceo_phone || '',
                        companyName: invitation.company_name || '',
                        companyId: companyIdFromMeta,
                        companyLogo: invitation.company_logo || '',
                        companyAddress: invitation.company_address || '',
                        companyWebsite: invitation.company_website || '',
                        additionalNotes: invitation.additional_notes || ''
                    }
                }
            });
        } catch (error: unknown) {
            if (IS_PROD) console.error('[API] Error fetching invitation');
            else console.error('[API] Error fetching invitation:', error);
            const safeMsg = 'שגיאה בטעינת הקישור';
            const msg = getUnknownErrorMessage(error) || safeMsg;
            return apiError(IS_PROD ? safeMsg : msg, { status: 500 });
        }
            }
        );

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error getting invitation link');
        else console.error('[API] Error getting invitation link:', error);
        const safeMsg = 'שגיאה בטעינת הקישור';
        const msg = getUnknownErrorMessage(error) || safeMsg;
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}

export const GET = shabbatGuard(GETHandler);
