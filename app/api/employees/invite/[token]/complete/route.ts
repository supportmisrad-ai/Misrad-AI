/**
 * API Route: Complete Employee Invitation
 * POST /api/employees/invite/[token]/complete
 * 
 * Handles the submission of employee signup form
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabase';
import { getUsers } from '../../../../../../lib/db';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';

export async function POST(
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
            namespace: 'employees-invite-complete',
            key: `${ip}:${String(token)}`,
            limit: 10,
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

        // 1. Get invitation
        const { data: invitation, error: getError } = await supabase
            .from('nexus_employee_invitation_links')
            .select('*')
            .eq('token', token)
            .limit(1)
            .maybeSingle();

        if (getError || !invitation) {
            return NextResponse.json(
                { error: 'קישור הזמנה לא נמצא' },
                { status: 404 }
            );
        }

        // 2. Check if already used
        if (invitation.is_used) {
            return NextResponse.json(
                { error: 'קישור זה כבר שימש' },
                { status: 410 }
            );
        }

        // 3. Check if active
        if (!invitation.is_active) {
            return NextResponse.json(
                { error: 'קישור זה לא פעיל' },
                { status: 403 }
            );
        }

        // 4. Check if expired
        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at);
            if (expiresAt < new Date()) {
                return NextResponse.json(
                    { error: 'קישור זה פג תוקף' },
                    { status: 410 }
                );
            }
        }

        // 5. Parse form data
        const body = await request.json();
        const {
            name,
            email,
            phone,
            password, // For Clerk signup
            // Additional details that might be filled
            bio,
            location
        } = body;

        // 6. Validate required fields
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'נא למלא את כל השדות החובה: שם, אימייל וסיסמה' },
                { status: 400 }
            );
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        // Important: invitation is email-addressed. Prevent using a token to register a different email.
        const invitedEmail = invitation.employee_email ? String(invitation.employee_email).trim().toLowerCase() : null;
        if (invitedEmail && normalizedEmail !== invitedEmail) {
            return NextResponse.json(
                { error: 'האימייל לא תואם לקישור ההזמנה' },
                { status: 403 }
            );
        }

        // 7. Check if email already exists
        const existingUsers = await getUsers({ email: normalizedEmail });
        if (existingUsers.length > 0) {
            return NextResponse.json(
                { error: 'משתמש עם אימייל זה כבר קיים במערכת' },
                { status: 400 }
            );
        }

        // 8. Get manager info (created_by)
        const managerUsers = await getUsers({ userId: invitation.created_by });
        const manager = managerUsers.length > 0 ? managerUsers[0] : null;

        // 9. Create user in database
        const userData = {
            name: name.trim(),
            email: normalizedEmail,
            phone: phone || invitation.employee_phone || null,
            role: invitation.role || 'עובד',
            department: invitation.department || null,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
            online: false,
            capacity: 0,
            location: location || null,
            bio: bio || null,
            payment_type: invitation.payment_type || null,
            hourly_rate: invitation.hourly_rate || null,
            monthly_salary: invitation.monthly_salary || null,
            commission_pct: invitation.commission_pct || null,
            manager_id: invitation.created_by, // Set manager
            targets: {},
            notification_preferences: {},
            two_factor_enabled: false,
            is_super_admin: false
        };

        const { data: newUser, error: createUserError } = await supabase
            .from('nexus_users')
            .insert(userData)
            .select()
            .single();

        if (createUserError) {
            console.error('[API] Error creating user:', createUserError);
            return NextResponse.json(
                { error: 'שגיאה ביצירת משתמש: ' + createUserError.message },
                { status: 500 }
            );
        }

        // 10. Mark invitation as used
        const { error: updateError } = await supabase
            .from('nexus_employee_invitation_links')
            .update({
                is_used: true,
                used_at: new Date().toISOString(),
                employee_name: name, // Update with actual name
                employee_phone: phone || invitation.employee_phone
            })
            .eq('id', invitation.id);

        if (updateError) {
            console.error('[API] Error updating invitation:', updateError);
            // Don't fail the request, but log it
        }

        // 11. Create notification for manager
        if (manager) {
            try {
                await supabase
                    .from('misrad_notifications')
                    .insert({
                        recipient_id: manager.id,
                        type: 'employee_invitation',
                        text: `עובד חדש נרשם: ${name} (${email})`,
                        actor_id: newUser.id,
                        actor_name: name,
                        related_id: invitation.id,
                        is_read: false,
                        metadata: {
                            department: invitation.department,
                            role: invitation.role,
                            employee_email: email
                        }
                    });
            } catch (notifError) {
                console.warn('[API] Could not create notification:', notifError);
            }
        }

        // 12. Return success (user should sign up via Clerk)
        let orgSlug: string | null = null;
        try {
            const organizationId = (invitation as any).organization_id as string | null;
            if (organizationId) {
                const { data: orgRow } = await supabase
                    .from('organizations')
                    .select('slug')
                    .eq('id', organizationId)
                    .maybeSingle();
                orgSlug = (orgRow as any)?.slug ? String((orgRow as any).slug) : String(organizationId);
            }
        } catch {
            // ignore
        }

        const lobbyPath = orgSlug ? `/w/${encodeURIComponent(orgSlug)}/lobby` : '/';

        return NextResponse.json({
            success: true,
            message: 'הרשמה הושלמה בהצלחה',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                department: newUser.department
            },
            // Note: User still needs to sign up via Clerk
            signupUrl: `/sign-up?email=${encodeURIComponent(normalizedEmail)}&invited=true&employee=true&redirect_url=${encodeURIComponent(lobbyPath)}`
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error in /api/employees/invite/[token]/complete POST:', error);
        return NextResponse.json(
            { error: error.message || 'שגיאה בהשלמת ההרשמה' },
            { status: 500 }
        );
    }
}
