/**
 * API Route: Create Employee Invitation Link
 * POST /api/employees/invite
 * 
 * Allows managers/CEOs to create invitation links for new employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '../../../../lib/auth';
import { getUsers } from '../../../../lib/db';
import { generateInvitationToken, getBaseUrl } from '../../../../lib/utils';
import { supabase } from '../../../../lib/supabase';
import { sendEmployeeInvitationEmail } from '../../../../lib/email';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { logAuditEvent } from '@/lib/audit';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { countOrganizationActiveUsers } from '@/lib/server/seats';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
async function POSTHandler(request: NextRequest) {
    try {
        const orgIdFromHeader = request.headers.get('x-org-id') || request.headers.get('x-orgid');

        // 1. Authenticate user
        const clerkUser = await getAuthenticatedUser();
        
        if (!clerkUser.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 400 }
            );
        }

        // 2. Find user in database
        const dbUsers = await getUsers({ email: clerkUser.email });
        const user = dbUsers.length > 0 ? dbUsers[0] : null;

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        // 3. Check permissions - must have manage_team permission
        try {
            await requirePermission('manage_team');
        } catch (permError: any) {
            // Also check if user is CEO/Admin
            const isAuthorized = 
                user.isSuperAdmin || 
                user.role === 'מנכ״ל' || 
                user.role === 'מנכ"ל' || 
                user.role === 'אדמין';

            if (!isAuthorized) {
                return NextResponse.json(
                    { error: 'אין הרשאה ליצור קישורי הזמנה לעובדים. נדרשת הרשאת manage_team' },
                    { status: 403 }
                );
            }
        }

        // 4. Parse request body
        const body = await request.json();
        const {
            employeeEmail,
            employeeName,
            employeePhone,
            department,
            role,
            paymentType,
            hourlyRate,
            monthlySalary,
            commissionPct,
            startDate,
            notes,
            expiresInDays = 30 // Default: 30 days
        } = body;

        // 5. Validate required fields
        if (!employeeEmail || !employeeEmail.includes('@')) {
            return NextResponse.json(
                { error: 'נא להזין אימייל תקין' },
                { status: 400 }
            );
        }

        const normalizedEmployeeEmail = String(employeeEmail).trim().toLowerCase();

        if (!department) {
            return NextResponse.json(
                { error: 'נא להזין מחלקה' },
                { status: 400 }
            );
        }

        if (!role) {
            return NextResponse.json(
                { error: 'נא להזין תפקיד' },
                { status: 400 }
            );
        }

        // 6. Check if email already exists
        const existingUsers = await getUsers({ email: normalizedEmployeeEmail });
        if (existingUsers.length > 0) {
            return NextResponse.json(
                { error: 'משתמש עם אימייל זה כבר קיים במערכת' },
                { status: 400 }
            );
        }

        // 7. Generate unique token
        const token = await generateInvitationToken();
        
        if (!token || token.trim() === '') {
            throw new Error('Failed to generate invitation token');
        }

        // 8. Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // 9. Create invitation link
        if (!supabase) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        let organizationId: string | null = orgIdFromHeader ? String(orgIdFromHeader) : null;

        // Resolve organization_id for tenant scoping (required for lobby redirect + RLS)
        if (!organizationId) {
            const { data: socialUserRow, error: socialUserError } = await supabase
                .from('social_users')
                .select('organization_id')
                .eq('clerk_user_id', clerkUser.id)
                .maybeSingle();

            if (socialUserError) {
                console.error('[API] Error resolving social user organization:', socialUserError);
                return NextResponse.json(
                    { error: 'שגיאה בזיהוי הארגון של המשתמש היוצר' },
                    { status: 500 }
                );
            }

            organizationId = (socialUserRow as any)?.organization_id as string | null;
        }

        if (!organizationId) {
            return NextResponse.json(
                { error: 'לא נמצא organization_id למשתמש היוצר. ודא שהמשתמש משויך ל-Workspace.' },
                { status: 400 }
            );
        }

        // Enforce strict multi-tenant access (works with either org slug or UUID id)
        const ws = await requireWorkspaceAccessByOrgSlugApi(String(organizationId));
        const flags = await getSystemFeatureFlags();

        let seatsAllowedOverride: number | null = null;
        try {
            const { data: orgSeatsRow, error: orgSeatsError } = await supabase
                .from('organizations')
                .select('seats_allowed')
                .eq('id', organizationId)
                .maybeSingle();

            if (!orgSeatsError) {
                seatsAllowedOverride = (orgSeatsRow as any)?.seats_allowed ?? null;
            }

            if (orgSeatsError?.message) {
                const msg = String(orgSeatsError.message).toLowerCase();
                if (msg.includes('column') && msg.includes('seats_allowed')) {
                    seatsAllowedOverride = null;
                }
            }
        } catch {
            seatsAllowedOverride = null;
        }

        const caps = computeWorkspaceCapabilities({
            entitlements: (ws as any)?.entitlements,
            fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
            seatsAllowedOverride,
        });

        if (!caps.isTeamManagementEnabled) {
            return NextResponse.json(
                { error: 'ניהול צוות זמין רק בחבילת משרד מלא' },
                { status: 403 }
            );
        }

        const activeUsers = await countOrganizationActiveUsers(String(organizationId));
        if (activeUsers >= caps.seatsAllowed) {
            return NextResponse.json(
                {
                    error: `הגעתם למכסת המשתמשים (${activeUsers} מתוך ${caps.seatsAllowed}). כדי להוסיף משתמשים יש לשדרג חבילה`,
                    seatUsage: { activeUsers, seatsAllowed: caps.seatsAllowed },
                },
                { status: 403 }
            );
        }

        const invitationData = {
            organization_id: organizationId,
            token,
            created_by: user.id,
            employee_email: normalizedEmployeeEmail,
            employee_name: employeeName || null,
            employee_phone: employeePhone || null,
            department: department,
            role: role,
            payment_type: paymentType || null,
            hourly_rate: hourlyRate || null,
            monthly_salary: monthlySalary || null,
            commission_pct: commissionPct || null,
            start_date: startDate || null,
            notes: notes || null,
            expires_at: expiresAt.toISOString(),
            is_used: false,
            is_active: true,
            metadata: {}
        };

        const { data: invitation, error: createError } = await supabase
            .from('nexus_employee_invitation_links')
            .insert(invitationData)
            .select()
            .single();

        if (createError) {
            console.error('[API] Error creating employee invitation link:', createError);

            await logAuditEvent('data.write', 'employees.invite', {
                success: false,
                details: {
                    organizationId,
                    employeeEmail: normalizedEmployeeEmail,
                },
                error: createError.message,
            });

            return NextResponse.json(
                { error: 'שגיאה ביצירת קישור הזמנה: ' + createError.message },
                { status: 500 }
            );
        }

        if (!invitation) {
            return NextResponse.json(
                { error: 'שגיאה ביצירת קישור הזמנה' },
                { status: 500 }
            );
        }

        // 10. Generate invitation URL
        const baseUrl = getBaseUrl(request);
        const invitationUrl = `${baseUrl}/employee-invite/${token}`;

        // 11. Send invitation email automatically
        try {
            const emailResult = await sendEmployeeInvitationEmail(
                employeeEmail,
                employeeName || null,
                department,
                role,
                invitationUrl,
                user.name || null
            );

            if (emailResult.success) {
                console.log('[Employee Invitation] Email sent successfully:', {
                    employeeEmail,
                    department,
                    role,
                    invitationUrl,
                    sentBy: user.email
                });
            } else {
                console.warn('[Employee Invitation] Failed to send email:', emailResult.error);
                // Don't fail the request, but log the error
            }
        } catch (emailError: any) {
            console.warn('[Employee Invitation] Error sending email:', emailError);
            // Don't fail the request if email fails
        }

        // 12. Create notification for manager (optional - to track)
        try {
            await supabase
                .from('misrad_notifications')
                .insert({
                    recipient_id: user.id,
                    type: 'employee_invitation',
                    text: `קישור הזמנה לעובד נוצר: ${employeeEmail}`,
                    actor_id: user.id,
                    actor_name: user.name,
                    related_id: invitation.id,
                    is_read: false,
                    metadata: {
                        employee_email: employeeEmail,
                        department: department,
                        role: role
                    }
                });
        } catch (notifError) {
            console.warn('[API] Could not create notification:', notifError);
            // Don't fail the request if notification fails
        }

        await logAuditEvent('data.write', 'employees.invite', {
            details: {
                organizationId,
                invitationId: invitation.id,
                employeeEmail: normalizedEmployeeEmail,
                department,
                role,
                expiresAt: invitation.expires_at,
            },
        });

        return NextResponse.json({
            success: true,
            invitation: {
                id: invitation.id,
                token: invitation.token,
                url: invitationUrl,
                employeeEmail: invitation.employee_email,
                department: invitation.department,
                role: invitation.role,
                expiresAt: invitation.expires_at,
                createdAt: invitation.created_at
            },
            message: 'קישור הזמנה נוצר בהצלחה'
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error in /api/employees/invite POST:', error);

        try {
            await logAuditEvent('data.write', 'employees.invite', {
                success: false,
                error: error?.message || 'Unknown error',
            });
        } catch {
            // ignore
        }

        return NextResponse.json(
            { error: error.message || 'שגיאה ביצירת קישור הזמנה' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

export const POST = shabbatGuard(POSTHandler);
