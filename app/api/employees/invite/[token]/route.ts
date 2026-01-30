/**
 * API Route: Get Employee Invitation by Token
 * GET /api/employees/invite/[token]
 * 
 * Returns invitation details for the signup form
 */

import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '../../../../../lib/supabase';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';
import { apiError, apiSuccess } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function GETHandler(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        if (!token) {
            return apiError('Token is required', { status: 400 });
        }

        const ip = getClientIpFromRequest(request);
        const rl = await rateLimit({
            namespace: 'employees-invite-token',
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

        const supabase = createServiceRoleClient({ allowUnscoped: true, reason: 'employee_invite_token_lookup' });

        // Get invitation
        const { data: invitation, error } = await supabase
            .from('nexus_employee_invitation_links')
            .select(
                'id, token, employee_email, employee_name, employee_phone, department, role, payment_type, hourly_rate, monthly_salary, commission_pct, start_date, notes, created_at, expires_at, used_at, is_used, is_active, metadata'
            )
            .eq('token', token)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[API] Error fetching invitation:', error);
            return apiError('שגיאה בטעינת הקישור', { status: 500 });
        }

        if (!invitation) {
            return apiError('קישור הזמנה לא נמצא', { status: 404 });
        }

        // Check if link is used
        if (invitation.is_used) {
            return apiSuccess({
                invitation: {
                    isUsed: true,
                    usedAt: invitation.used_at,
                },
            });
        }

        // Check if link is active
        if (!invitation.is_active) {
            return apiError('קישור זה לא פעיל', { status: 403 });
        }

        // Check if link is expired
        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at);
            if (expiresAt < new Date()) {
                return apiError('קישור זה פג תוקף', { status: 410 });
            }
        }

        // Return invitation data
        return apiSuccess({
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
        return apiError(error, { status: 500, message: error.message || 'שגיאה בטעינת הקישור' });
    }
}

export const GET = shabbatGuard(GETHandler);
