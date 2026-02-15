import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
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
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

async function GETHandler(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const { token } = params;

        if (!token) {
            return apiError('Token is required', { status: 400 });
        }

        const ip = getClientIpFromRequest(request);
        const rl = await rateLimit({
            namespace: 'employees-invite-token',
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
            { source: 'api_employees_invite_token', reason: 'read_employee_invitation', suppressReporting: true },
            async () => {

        const invitation = await prisma.nexus_employee_invitation_links.findUnique({
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

            }
        );

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/employees/invite/[token] GET');
        else console.error('[API] Error in /api/employees/invite/[token] GET:', error);
        const msg = getUnknownErrorMessage(error) || 'שגיאה בטעינת הקישור';
        const safeMsg = 'שגיאה בטעינת הקישור';
        return apiError(IS_PROD ? safeMsg : error, { status: 500, message: IS_PROD ? safeMsg : msg });
    }
}

export const GET = shabbatGuard(GETHandler);
