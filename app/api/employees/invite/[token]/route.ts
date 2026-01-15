/**
 * API Route: Get Employee Invitation by Token
 * GET /api/employees/invite/[token]
 * 
 * Returns invitation details for the signup form
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        const ip = getClientIpFromRequest(request);
        const rl = await rateLimit({
            namespace: 'employees-invite-token',
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

        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        // Get invitation
        const { data: invitation, error } = await supabase
            .from('nexus_employee_invitation_links')
            .select('*')
            .eq('token', token)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[API] Error fetching invitation:', error);
            return NextResponse.json(
                { error: 'שגיאה בטעינת הקישור' },
                { status: 500 }
            );
        }

        if (!invitation) {
            return NextResponse.json(
                { error: 'קישור הזמנה לא נמצא' },
                { status: 404 }
            );
        }

        // Check if link is used
        if (invitation.is_used) {
            return NextResponse.json(
                { 
                    error: 'קישור זה כבר שימש',
                    invitation: {
                        isUsed: true,
                        usedAt: invitation.used_at
                    }
                },
                { status: 410 } // Gone
            );
        }

        // Check if link is active
        if (!invitation.is_active) {
            return NextResponse.json(
                { error: 'קישור זה לא פעיל' },
                { status: 403 }
            );
        }

        // Check if link is expired
        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at);
            if (expiresAt < new Date()) {
                return NextResponse.json(
                    { error: 'קישור זה פג תוקף' },
                    { status: 410 }
                );
            }
        }

        // Return invitation data
        return NextResponse.json({
            invitation: {
                id: invitation.id,
                token: invitation.token,
                employeeEmail: invitation.employee_email,
                employeeName: invitation.employee_name,
                employeePhone: invitation.employee_phone,
                department: invitation.department,
                role: invitation.role,
                paymentType: invitation.payment_type,
                hourlyRate: invitation.hourly_rate,
                monthlySalary: invitation.monthly_salary,
                commissionPct: invitation.commission_pct,
                startDate: invitation.start_date,
                notes: invitation.notes,
                createdAt: invitation.created_at,
                expiresAt: invitation.expires_at
            }
        });

    } catch (error: any) {
        console.error('[API] Error in /api/employees/invite/[token] GET:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בטעינת הקישור' },
            { status: 500 }
        );
    }
}

export const GET = shabbatGuard(GETHandler);
