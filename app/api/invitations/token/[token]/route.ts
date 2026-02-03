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
async function GETHandler(
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
            namespace: 'invitation-token',
            key: `${ip}:${String(token)}`,
            limit: 30,
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

        let invitations: any[] = [];
        try {
            const row = await (prisma as any).system_invitation_links.findUnique({
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
            invitations = row ? [row] : [];
        } catch (error: any) {
            console.error('[API] Error fetching invitation:', error);
            const errorMessage = error.message || 'שגיאה בטעינת הקישור';
            return apiError(errorMessage, { status: 500 });
        }

        if (invitations.length === 0) {
            return apiError('קישור לא נמצא', { status: 404 });
        }

        const invitation = invitations[0];

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
                    companyId: (typeof invitation.metadata === 'object' && invitation.metadata?.companyId) || '',
                    companyLogo: invitation.company_logo || '',
                    companyAddress: invitation.company_address || '',
                    companyWebsite: invitation.company_website || '',
                    additionalNotes: invitation.additional_notes || ''
                }
            }
        });

    } catch (error: any) {
        console.error('[API] Error getting invitation link:', error);
        return apiError(error, { status: 500, message: error.message || 'שגיאה בטעינת הקישור' });
    }
}

export const GET = shabbatGuard(GETHandler);
