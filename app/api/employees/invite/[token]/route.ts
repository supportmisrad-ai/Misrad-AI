/**
 * API Route: Get Employee Invitation by Token
 * GET /api/employees/invite/[token]
 * 
 * Returns invitation details for the signup form
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
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

        const invitation = await (prisma as any).nexus_employee_invitation_links.findUnique({
            where: { token: String(token) },
            select: {
                id: true,
                token: true,
                employee_email: true,
                employee_name: true,
                employee_phone: true,
                department: true,
                role: true,
                payment_type: true,
                hourly_rate: true,
                monthly_salary: true,
                commission_pct: true,
                start_date: true,
                notes: true,
                created_at: true,
                expires_at: true,
                used_at: true,
                is_used: true,
                is_active: true,
                metadata: true,
            },
        });

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
