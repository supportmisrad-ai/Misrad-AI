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

import { shabbatGuard } from '@/lib/api-shabbat-guard';

type UnknownRecord = Record<string, unknown>;

function asObject(value: unknown): UnknownRecord | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as UnknownRecord;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : '';
}

type WorkspaceUserRow = {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    department: string | null;
};

async function selectUserIdByEmailInWorkspace(params: { workspaceId: string; email: string }): Promise<string | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
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
    const rowObj = asObject(row);
    return rowObj?.id ? String(rowObj.id) : null;
}

async function loadUserInWorkspaceById(params: { workspaceId: string; userId: string }) {
    const userId = String(params.userId || '').trim();
    if (!userId) return null;

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
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

    const row = Array.isArray(rows) ? rows[0] ?? null : null;
    const r = asObject(row);
    if (!r?.id) return null;
    return {
        id: String(r.id),
        name: r.name == null ? null : String(r.name),
        email: r.email == null ? null : String(r.email),
        role: r.role == null ? null : String(r.role),
        department: r.department == null ? null : String(r.department),
    } satisfies WorkspaceUserRow;
}

async function insertUserInWorkspace(params: { workspaceId: string; userData: unknown }) {
    const u = asObject(params.userData) ?? {};

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
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

    const row = Array.isArray(rows) ? rows[0] ?? null : null;
    const r = asObject(row);
    if (!r?.id) return null;
    return {
        id: String(r.id),
        name: r.name == null ? null : String(r.name),
        email: r.email == null ? null : String(r.email),
        role: r.role == null ? null : String(r.role),
        department: r.department == null ? null : String(r.department),
    } satisfies WorkspaceUserRow;
}

async function markInvitationUsed(params: { organizationId: string; invitationId: string; patch: unknown }) {
    const patchObj = asObject(params.patch) ?? {};
    await prisma.nexus_employee_invitation_links.updateMany({
        where: { id: String(params.invitationId), organizationId: String(params.organizationId) },
        data: {
            is_used: Boolean(patchObj.is_used),
            used_at: patchObj.used_at ? new Date(String(patchObj.used_at)) : new Date(),
            employee_name: patchObj.employee_name ?? undefined,
            employee_phone: patchObj.employee_phone ?? undefined,
            updated_at: new Date(),
            metadata: patchObj.metadata ?? undefined,
        },
    });
}

async function insertNotification(params: { workspaceId: string; notification: unknown }) {
    const n = asObject(params.notification) ?? {};
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
        const invitation = await prisma.nexus_employee_invitation_links.findUnique({
            where: { token: String(token) },
        });

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

        const organizationId = invitation.organizationId as string | null;
        if (!organizationId) {
            return apiError('הזמנה לא משויכת לארגון', { status: 400 });
        }

        const org = await prisma.social_organizations.findUnique({
            where: { id: String(organizationId) },
            select: {
                has_nexus: true,
                has_system: true,
                has_social: true,
                has_finance: true,
                has_client: true,
                has_operations: true,
                seats_allowed: true,
                slug: true,
            },
        });

        if (!org) {
            return apiError('ארגון לא נמצא', { status: 404 });
        }

        const flags = await getSystemFeatureFlags();
        const caps = computeWorkspaceCapabilities({
            entitlements: {
                nexus: org.has_nexus ?? false,
                system: org.has_system ?? false,
                social: org.has_social ?? false,
                finance: org.has_finance ?? false,
                client: org.has_client ?? false,
                operations: org.has_operations ?? false,
            },
            fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
            seatsAllowedOverride: org.seats_allowed ?? null,
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
        const body: unknown = await request.json();
        const bodyObj = asObject(body) ?? {};
        const name = String(bodyObj.name ?? '').trim();
        const email = String(bodyObj.email ?? '').trim();
        const phone = bodyObj.phone == null ? null : String(bodyObj.phone).trim();
        const password = String(bodyObj.password ?? '').trim();
        const bio = bodyObj.bio == null ? null : String(bodyObj.bio);
        const location = bodyObj.location == null ? null : String(bodyObj.location);

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
            name,
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
            } catch (notifError: unknown) {
                console.warn('[API] Could not create notification:', notifError);
            }
        }

        // 12. Return success (user should sign up via Clerk)
        const orgSlug = org.slug ? String(org.slug) : String(organizationId);

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
            signupUrl: `/login?mode=sign-up&email=${encodeURIComponent(normalizedEmail)}&invited=true&employee=true&redirect=${encodeURIComponent(lobbyPath)}`
        }, { status: 201 });

    } catch (error: unknown) {
        console.error('[API] Error in /api/employees/invite/[token]/complete POST:', error);
        return apiError(error, { status: 500, message: getErrorMessage(error) || 'שגיאה בהשלמת ההרשמה' });
    }
}

export const POST = shabbatGuard(POSTHandler);
