/**
 * API Route: Complete Employee Invitation
 * POST /api/employees/invite/[token]/complete
 * 
 * Handles the submission of employee signup form
 */

import { NextRequest } from 'next/server';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma, { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import { createServiceRoleClient, createServiceRoleClientScoped } from '@/lib/supabase';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

async function selectUserIdByEmailInWorkspace(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const rows = await queryRawOrgScoped<any[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'employee_invite_complete_user_id_by_email',
        query: `
            select id::text as id
            from nexus_users
            where organization_id = $1::uuid
              and lower(email) = $2::text
            limit 1
        `,
        values: [params.workspaceId, email],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    return row?.id ? String(row.id) : null;
}

async function loadUserInWorkspaceById(params: { workspaceId: string; userId: string }) {
    const userId = String(params.userId || '').trim();
    if (!userId) return null;

    const rows = await queryRawOrgScoped<any[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'employee_invite_complete_user_by_id',
        query: `
            select id::text as id, name, email, role, department
            from nexus_users
            where organization_id = $1::uuid
              and id = $2::uuid
            limit 1
        `,
        values: [params.workspaceId, userId],
    });

    return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function insertUserInWorkspace(params: { workspaceId: string; userData: any }) {
    const u = params.userData || {};

    const rows = await queryRawOrgScoped<any[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'employee_invite_complete_user_insert',
        query: `
            insert into nexus_users (
                organization_id,
                name,
                email,
                phone,
                role,
                department,
                avatar,
                online,
                capacity,
                location,
                bio,
                payment_type,
                hourly_rate,
                monthly_salary,
                commission_pct,
                manager_id,
                targets,
                notification_preferences,
                two_factor_enabled,
                is_super_admin,
                created_at,
                updated_at
            ) values (
                $1::uuid,
                $2::text,
                $3::text,
                $4::text,
                $5::text,
                $6::text,
                $7::text,
                $8::boolean,
                $9::int,
                $10::text,
                $11::text,
                $12::text,
                $13::numeric,
                $14::numeric,
                $15::int,
                $16::uuid,
                $17::jsonb,
                $18::jsonb,
                $19::boolean,
                $20::boolean,
                now(),
                now()
            )
            returning id::text as id, name, email, role, department
        `,
        values: [
            params.workspaceId,
            u.name ?? null,
            u.email ?? null,
            u.phone ?? null,
            u.role ?? null,
            u.department ?? null,
            u.avatar ?? null,
            Boolean(u.online),
            Number(u.capacity ?? 0),
            u.location ?? null,
            u.bio ?? null,
            u.payment_type ?? null,
            u.hourly_rate ?? null,
            u.monthly_salary ?? null,
            u.commission_pct ?? null,
            u.manager_id ?? null,
            u.targets ?? {},
            u.notification_preferences ?? {},
            Boolean(u.two_factor_enabled),
            Boolean(u.is_super_admin),
        ],
    });

    return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function markInvitationUsed(params: { organizationId: string; invitationId: string; patch: any }) {
    await prisma.nexus_employee_invitation_links.updateMany({
        where: { id: String(params.invitationId), organizationId: String(params.organizationId) },
        data: {
            is_used: Boolean(params.patch?.is_used),
            used_at: params.patch?.used_at ? new Date(String(params.patch.used_at)) : new Date(),
            employee_name: params.patch?.employee_name ?? undefined,
            employee_phone: params.patch?.employee_phone ?? undefined,
            updated_at: new Date(),
            metadata: params.patch?.metadata ?? undefined,
        },
    });
}

async function insertNotification(params: { workspaceId: string; notification: any }) {
    const n = params.notification || {};
    await executeRawOrgScoped(prisma, {
        organizationId: params.workspaceId,
        reason: 'employee_invite_complete_notification_insert',
        query: `
            insert into misrad_notifications
                (organization_id, recipient_id, type, text, actor_id, actor_name, related_id, is_read, metadata, created_at, updated_at)
            values
                ($1::uuid, $2::uuid, $3::text, $4::text, $5::uuid, $6::text, $7::uuid, $8::boolean, $9::jsonb, $10::timestamptz, $10::timestamptz)
        `,
        values: [
            String(n.organization_id),
            String(n.recipient_id),
            String(n.type),
            String(n.text),
            n.actor_id ?? null,
            n.actor_name ?? null,
            n.related_id ?? null,
            Boolean(n.is_read),
            n.metadata ?? {},
            String(n.created_at || new Date().toISOString()),
        ],
    });
}
async function POSTHandler(
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
            namespace: 'employees-invite-complete',
            key: `${ip}:${String(token)}`,
            limit: 10,
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

        // 1. Get invitation by token (token is a secret; use Service Role for unscoped lookup)
        const svc = createServiceRoleClient({ allowUnscoped: true, reason: 'employee_invite_token_lookup' });
        const invitationRes = await svc
            .from('nexus_employee_invitation_links')
            .select('*')
            .eq('token', String(token))
            .limit(1)
            .maybeSingle();

        if (invitationRes.error) {
            throw new Error(invitationRes.error.message);
        }

        const invitation = invitationRes.data;

        if (!invitation) {
            return apiError('קישור הזמנה לא נמצא', { status: 404 });
        }

        // 2. Check if already used
        if (invitation.is_used) {
            return apiError('קישור זה כבר שימש', { status: 410 });
        }

        // 3. Check if active
        if (!invitation.is_active) {
            return apiError('קישור זה לא פעיל', { status: 403 });
        }

        // 4. Check if expired
        if (invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at);
            if (expiresAt < new Date()) {
                return apiError('קישור זה פג תוקף', { status: 410 });
            }
        }

        const organizationId = (invitation as any).organization_id as string | null;
        if (!organizationId) {
            return apiError('הזמנה לא משויכת לארגון', { status: 400 });
        }

        const orgScoped = createServiceRoleClientScoped({
            reason: 'employee_invite_finalize_org',
            scopeColumn: 'organization_id',
            scopeId: String(organizationId),
        });

        const orgRes = await orgScoped
            .from('organizations')
            .select('has_nexus, has_system, has_social, has_finance, has_client, has_operations, seats_allowed, slug')
            .eq('id', String(organizationId))
            .limit(1)
            .maybeSingle();

        if (orgRes.error) {
            throw new Error(orgRes.error.message);
        }

        const org = orgRes.data as any;

        const flags = await getSystemFeatureFlags();
        const caps = computeWorkspaceCapabilities({
            entitlements: {
                nexus: (org as any)?.has_nexus ?? false,
                system: (org as any)?.has_system ?? false,
                social: (org as any)?.has_social ?? false,
                finance: (org as any)?.has_finance ?? false,
                client: (org as any)?.has_client ?? false,
                operations: (org as any)?.has_operations ?? false,
            },
            fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
            seatsAllowedOverride: (org as any)?.seats_allowed ?? null,
        });

        if (!caps.isTeamManagementEnabled) {
            return apiError('ניהול צוות זמין רק עם מודול Nexus', { status: 403 });
        }

        const activeUsers = await countOrganizationActiveUsers(String(organizationId));
        if (activeUsers >= caps.seatsAllowed) {
            return apiError(
                `הגעתם למכסת המשתמשים (${activeUsers} מתוך ${caps.seatsAllowed}). לא ניתן להשלים הרשמה`,
                { status: 403 }
            );
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
            return apiError('נא למלא את כל השדות החובה: שם, אימייל וסיסמה', { status: 400 });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        // Important: invitation is email-addressed. Prevent using a token to register a different email.
        const invitedEmail = invitation.employee_email ? String(invitation.employee_email).trim().toLowerCase() : null;
        if (invitedEmail && normalizedEmail !== invitedEmail) {
            return apiError('האימייל לא תואם לקישור ההזמנה', { status: 403 });
        }

        // 7. Check if email already exists
        const existingUserId = await selectUserIdByEmailInWorkspace({ workspaceId: organizationId, email: normalizedEmail });
        if (existingUserId) {
            return apiError('משתמש עם אימייל זה כבר קיים במערכת', { status: 400 });
        }

        // 8. Get manager info (created_by)
        const manager = invitation.created_by
            ? await loadUserInWorkspaceById({ workspaceId: organizationId, userId: String(invitation.created_by) })
            : null;

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

        const newUser = await insertUserInWorkspace({ workspaceId: organizationId, userData });
        if (!newUser?.id) {
            return apiError('שגיאה ביצירת משתמש', { status: 500 });
        }

        // 10. Mark invitation as used
        await markInvitationUsed({
            organizationId,
            invitationId: String(invitation.id),
            patch: {
                is_used: true,
                used_at: new Date().toISOString(),
                employee_name: name,
                employee_phone: phone || invitation.employee_phone,
            },
        });

        // 11. Create notification for manager
        if (manager) {
            try {
                await insertNotification({
                    workspaceId: organizationId,
                    notification: {
                        organization_id: organizationId,
                        recipient_id: manager.id,
                        type: 'employee_invitation',
                        text: `עובד חדש נרשם: ${name} (${email})`,
                        actor_id: newUser.id,
                        actor_name: name,
                        related_id: String(invitation.id),
                        is_read: false,
                        metadata: {
                            department: invitation.department,
                            role: invitation.role,
                            employee_email: email,
                        },
                        created_at: new Date().toISOString(),
                    },
                });
            } catch (notifError: any) {
                console.warn('[API] Could not create notification:', notifError);
            }
        }

        // 12. Return success (user should sign up via Clerk)
        const orgSlug = (org as any)?.slug ? String((org as any).slug) : String(organizationId);

        const lobbyPath = orgSlug ? `/w/${encodeURIComponent(orgSlug)}/lobby` : '/';

        return apiSuccess({
            message: 'הרשמה הושלמה בהצלחה',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                department: newUser.department
            },
            signupUrl: `/sign-up?email=${encodeURIComponent(normalizedEmail)}&invited=true&employee=true&redirect_url=${encodeURIComponent(lobbyPath)}`
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Error in /api/employees/invite/[token]/complete POST:', error);
        return apiError(error, { status: 500, message: 'שגיאה בהשלמת ההרשמה' });
    }
}

export const POST = shabbatGuard(POSTHandler);
