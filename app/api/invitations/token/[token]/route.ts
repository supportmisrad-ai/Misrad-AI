/**
 * API Route: Get Invitation Link Details
 * GET /api/invitations/token/[token]
 * 
 * Gets invitation link details (for form page)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';

export async function GET(
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
            namespace: 'invitation-token',
            key: `${ip}:${String(token)}`,
            limit: 30,
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

        // Get invitation link - use limit(1) to avoid single() coercion error
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
                ceo_phone,
                company_name,
                company_logo,
                company_address,
                company_website,
                additional_notes,
                source,
                metadata
            `)
            .eq('token', token)
            .limit(1);

        if (error) {
            console.error('[API] Error fetching invitation:', error);
            // Return more specific error message
            const errorMessage = error.message || 'שגיאה בטעינת הקישור';
            return NextResponse.json(
                { 
                    error: errorMessage,
                    details: error.code || 'UNKNOWN_ERROR'
                },
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

        // Check if link is used FIRST - show completion message
        if (invitation.is_used) {
            return NextResponse.json(
                { 
                    error: 'הטופס כבר הושלם',
                    used: true,
                    usedAt: invitation.used_at,
                    completed: true,
                    companyName: invitation.company_name,
                    ceoName: invitation.ceo_name
                },
                { status: 410 } // 410 Gone
            );
        }

        // Check if link is expired
        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at);
            const now = new Date();
            if (now > expiresAt) {
                return NextResponse.json(
                    { 
                        error: 'קישור זה פג תוקף',
                        expired: true,
                        expiresAt: invitation.expires_at
                    },
                    { status: 410 } // 410 Gone
                );
            }
        }

        // Check if link is active
        if (!invitation.is_active) {
            return NextResponse.json(
                { 
                    error: 'קישור זה אינו פעיל',
                    active: false
                },
                { status: 403 }
            );
        }

        // Return invitation details (without sensitive data)
        return NextResponse.json({
            success: true,
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
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת הקישור' },
            { status: 500 }
        );
    }
}
