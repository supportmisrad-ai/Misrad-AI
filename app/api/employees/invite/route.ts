import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * API Route: Create Employee Invitation Link
 * POST /api/employees/invite
 * 
 * Allows managers/CEOs to create invitation links for new employees
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { getBaseUrl, generateInvitationToken } from '@/lib/utils';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { logAuditEvent } from '@/lib/audit';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { countOrganizationActiveUsers } from '@/lib/server/seats';
import { enqueueEmployeeInviteEmail } from '@/lib/server/employeeInviteEmailQueue';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { WorkspaceEntitlements } from '@/lib/server/workspace';
import prisma, { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
const IS_PROD = process.env.NODE_ENV === 'production';


function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
    const v = obj[key];
    return typeof v === 'string' ? v : v == null ? fallback : String(v);
}


function isMissingRelationOrColumnError(error: unknown): boolean {
    const obj = asObject(error) ?? {};
    const code = String(obj['code'] ?? '').toLowerCase();
    const message = String(obj['message'] ?? '').toLowerCase();
    return code === '42p01' || code === '42703' || message.includes('does not exist') || message.includes('relation') || message.includes('column');
}

type WorkspaceUserRow = {
    id: string;
    name: string | null;
    email: string;
    department: string | null;
    role: string;
    isSuperAdmin: boolean;
};

async function loadUserInWorkspaceByEmail(params: { workspaceId: string; email: string }): Promise<WorkspaceUserRow | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'employee_invite_load_user_by_email',
        query: `
            select
                id::text as id,
                name,
                email,
                department,
                role,
                is_super_admin
            from nexus_users
            where organization_id = $1::uuid
              and lower(email) = $2::text
            order by updated_at desc nulls last, created_at desc nulls last
            limit 1
        `,
        values: [params.workspaceId, email],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    const obj = asObject(row);
    if (!obj) return null;
    return {
        id: getString(obj, 'id'),
        name: (obj['name'] == null ? null : String(obj['name'])) as string | null,
        email: getString(obj, 'email'),
        department: (obj['department'] == null ? null : String(obj['department'])) as string | null,
        role: getString(obj, 'role'),
        isSuperAdmin: Boolean(obj['is_super_admin']),
    };
}

async function insertNotification(params: {
    workspaceId: string;
    notification: {
        organization_id: string;
        recipient_id: string;
        type: string;
        text: string;
        actor_id?: string | null;
        actor_name?: string | null;
        related_id?: string | null;
        is_read: boolean;
        metadata?: unknown;
        created_at: string;
    };
}) {
    await executeRawOrgScoped(prisma, {
        organizationId: params.workspaceId,
        reason: 'employee_invite_notification_insert',
        query: `
            insert into misrad_notifications
                (organization_id, recipient_id, type, text, actor_id, actor_name, related_id, is_read, metadata, created_at, updated_at)
            values
                ($1::uuid, $2::uuid, $3::text, $4::text, $5::uuid, $6::text, $7::uuid, $8::boolean, $9::jsonb, $10::timestamptz, $10::timestamptz)
        `,
        values: [
            params.notification.organization_id,
            params.notification.recipient_id,
            params.notification.type,
            params.notification.text,
            params.notification.actor_id ?? null,
            params.notification.actor_name ?? null,
            params.notification.related_id ?? null,
            Boolean(params.notification.is_read),
            params.notification.metadata ?? {},
            params.notification.created_at,
        ],
    });
}

async function POSTHandler(request: NextRequest) {
    try {
        const { workspace } = await getWorkspaceOrThrow(request);

        // 1. Authenticate user
        const clerkUser = await getAuthenticatedUser();
        
        if (!clerkUser.email) {
            return apiError('User email not found', { status: 400 });
        }

        // 2. Find user in database
        const user = await loadUserInWorkspaceByEmail({
            workspaceId: workspace.id,
            email: clerkUser.email,
        });

        if (!user) {
            return apiError('User not found in database', { status: 404 });
        }

        // 3. Check permissions - must have manage_team permission
        try {
            await requirePermission('manage_team');
        } catch (permError: unknown) {
            // Also check if user is CEO/Admin
            const isAuthorized = 
                user.isSuperAdmin || 
                isTenantAdminRole(user.role);

            if (!isAuthorized) {
                return apiError('אין הרשאה ליצור קישורי הזמנה לעובדים. נדרשת הרשאת manage_team', { status: 403 });
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
            return apiError('נא להזין אימייל תקין', { status: 400 });
        }

        const normalizedEmployeeEmail = String(employeeEmail).trim().toLowerCase();

        if (!department) {
            return apiError('נא להזין מחלקה', { status: 400 });
        }

        if (!role) {
            return apiError('נא להזין תפקיד', { status: 400 });
        }

        // 6. Check if email already exists
        const existingUser = await loadUserInWorkspaceByEmail({
            workspaceId: workspace.id,
            email: normalizedEmployeeEmail,
        });
        if (existingUser) {
            return apiError('משתמש עם אימייל זה כבר קיים במערכת', { status: 400 });
        }

        // 7. Generate unique token
        const token = await generateInvitationToken();
        
        if (!token || token.trim() === '') {
            throw new Error('Failed to generate invitation token');
        }

        // 8. Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const organizationId = String(workspace.id);

        // Enforce strict multi-tenant access (works with either org slug or UUID id)
        const ws = workspace;
        const flags = await getSystemFeatureFlags();

        let seatsAllowedOverride: number | null = null;
        try {
            const rows = await queryRawOrgScoped<unknown[]>(prisma, {
                organizationId,
                reason: 'employee_invite_seats_allowed',
                query: `select seats_allowed from organizations where id = $1::uuid limit 1`,
                values: [organizationId],
            });

            const first = Array.isArray(rows) ? rows[0] : null;
            const firstObj = asObject(first);
            const rawSeats = firstObj ? firstObj['seats_allowed'] : null;
            seatsAllowedOverride = typeof rawSeats === 'number' ? rawSeats : rawSeats == null ? null : Number(rawSeats);
            if (typeof seatsAllowedOverride === 'number' && Number.isNaN(seatsAllowedOverride)) {
                seatsAllowedOverride = null;
            }
        } catch (e: unknown) {
            if (getErrorMessage(e).includes('[SchemaMismatch]')) {
                throw e;
            }
            if (isMissingRelationOrColumnError(e) && !ALLOW_SCHEMA_FALLBACKS) {
                throw new Error(`[SchemaMismatch] organizations.seats_allowed query failed (${getErrorMessage(e) || 'missing relation'})`);
            }

            if (isMissingRelationOrColumnError(e) && ALLOW_SCHEMA_FALLBACKS) {
                reportSchemaFallback({
                    source: 'app/api/employees/invite.POSTHandler',
                    reason: 'organizations.seats_allowed query schema mismatch (fallback seatsAllowedOverride=null)',
                    error: e,
                    extras: { organizationId },
                });
            }
            seatsAllowedOverride = null;
        }

        const wsObj = asObject(ws as unknown);
        const entitlementsRaw = wsObj ? wsObj['entitlements'] : undefined;
        const entitlements: WorkspaceEntitlements | null | undefined =
            entitlementsRaw && typeof entitlementsRaw === 'object'
                ? (entitlementsRaw as WorkspaceEntitlements)
                : entitlementsRaw == null
                  ? undefined
                  : undefined;

        const caps = computeWorkspaceCapabilities({
            entitlements,
            fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance),
            seatsAllowedOverride,
        });

        if (!caps.isTeamManagementEnabled) {
            return apiError('ניהול צוות זמין רק עם מודול Nexus', { status: 403 });
        }

        const activeUsers = await countOrganizationActiveUsers(organizationId);
        if (activeUsers >= caps.seatsAllowed) {
            return apiError(`הגעתם למכסת המשתמשים (${activeUsers} מתוך ${caps.seatsAllowed}). כדי להוסיף משתמשים יש לשדרג חבילה`, { status: 403 });
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

        let invitation: Prisma.nexus_employee_invitation_linksGetPayload<Prisma.nexus_employee_invitation_linksDefaultArgs>;
        try {
            invitation = await prisma.nexus_employee_invitation_links.create({
                data: {
                    organizationId: String(organizationId),
                    token: String(token),
                    created_by: invitationData.created_by ? String(invitationData.created_by) : null,
                    employee_email: String(invitationData.employee_email),
                    employee_name: invitationData.employee_name,
                    employee_phone: invitationData.employee_phone,
                    department: invitationData.department,
                    role: invitationData.role,
                    payment_type: invitationData.payment_type,
                    hourly_rate:
                        invitationData.hourly_rate !== null && invitationData.hourly_rate !== undefined
                            ? new Prisma.Decimal(String(invitationData.hourly_rate))
                            : null,
                    monthly_salary:
                        invitationData.monthly_salary !== null && invitationData.monthly_salary !== undefined
                            ? new Prisma.Decimal(String(invitationData.monthly_salary))
                            : null,
                    commission_pct:
                        invitationData.commission_pct !== null && invitationData.commission_pct !== undefined
                            ? Number(invitationData.commission_pct)
                            : null,
                    start_date: invitationData.start_date ? new Date(String(invitationData.start_date)) : null,
                    notes: invitationData.notes,
                    expires_at: invitationData.expires_at ? new Date(String(invitationData.expires_at)) : null,
                    is_used: Boolean(invitationData.is_used),
                    is_active: Boolean(invitationData.is_active),
                    metadata: invitationData.metadata,
                    updated_at: new Date(),
                },
            });
        } catch (createError: unknown) {
            if (IS_PROD) console.error('[API] Error creating employee invitation link');
            else console.error('[API] Error creating employee invitation link:', createError);

            const safeMsg = 'שגיאה ביצירת קישור הזמנה';
            const details = String(getErrorMessage(createError) || '').trim();
            const devMsg = details ? `${safeMsg}: ${details}` : safeMsg;

            await logAuditEvent('data.write', 'employees.invite', {
                success: false,
                details: {
                    organizationId,
                    employeeEmail: normalizedEmployeeEmail,
                },
                error: IS_PROD ? safeMsg : getErrorMessage(createError) || safeMsg,
            });

            return apiError(IS_PROD ? safeMsg : devMsg, { status: 500 });
        }

        // 10. Generate invitation URL
        const baseUrl = getBaseUrl(request);
        const finalizePath = `/employee-invite/${encodeURIComponent(String(token))}/finalize`;
        const finalizeUrl = `${baseUrl}${finalizePath}`;
        const invitationUrl = `${baseUrl}/login?mode=sign-up&email=${encodeURIComponent(normalizedEmployeeEmail)}&invited=true&employee=true&redirect=${encodeURIComponent(finalizePath)}`;

        // 11. Enqueue invitation email (async)
        try {
            const enqueueRes = await enqueueEmployeeInviteEmail({
                invitationId: String(invitation.id),
                organizationId: String(workspace.id),
                toEmail: normalizedEmployeeEmail,
                employeeName: employeeName || null,
                department,
                role,
                invitationUrl,
                createdByName: user.name || null,
            });

            if (!enqueueRes.queued) {
                if (IS_PROD) console.warn('[Employee Invitation] Failed to enqueue email');
                else console.warn('[Employee Invitation] Failed to enqueue email:', enqueueRes.error);
            }
        } catch (emailError: unknown) {
            if (IS_PROD) console.warn('[Employee Invitation] Error enqueueing email');
            else console.warn('[Employee Invitation] Error enqueueing email:', emailError);
        }

        // 12. Create notification for manager (optional - to track)
        try {
            await insertNotification({
                workspaceId: String(workspace.id),
                notification: {
                    organization_id: String(workspace.id),
                    recipient_id: String(user.id),
                    type: 'employee_invitation',
                    text: `קישור הזמנה לעובד נוצר: ${employeeEmail}`,
                    actor_id: String(user.id),
                    actor_name: user.name || null,
                    related_id: String(invitation.id),
                    is_read: false,
                    metadata: {
                        employee_email: employeeEmail,
                        department: department,
                        role: role,
                    },
                    created_at: new Date().toISOString(),
                },
            });
        } catch (notifError: unknown) {
            if (isMissingRelationOrColumnError(notifError) && !ALLOW_SCHEMA_FALLBACKS) {
                throw new Error(`[SchemaMismatch] misrad_notifications insert failed (${getErrorMessage(notifError) || 'missing relation'})`);
            }

            if (isMissingRelationOrColumnError(notifError) && ALLOW_SCHEMA_FALLBACKS) {
                reportSchemaFallback({
                    source: 'app/api/employees/invite.POSTHandler',
                    reason: 'misrad_notifications insert schema mismatch (drop notification)',
                    error: notifError,
                    extras: { organizationId, invitationId: String(invitation?.id || '') },
                });
            }
            if (IS_PROD) console.warn('[API] Could not create notification');
            else console.warn('[API] Could not create notification:', notifError);
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

        return apiSuccess({
            invitation: {
                id: invitation.id,
                token: invitation.token,
                url: invitationUrl,
                employeeEmail: invitation.employee_email,
                department: invitation.department,
                role: invitation.role,
                expiresAt: invitation.expires_at,
                createdAt: invitation.created_at,
            },
            message: 'קישור הזמנה נוצר בהצלחה',
        }, { status: 201 });

    } catch (error: unknown) {
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                        ? 'Unauthorized'
                        : error.status === 404
                            ? 'Not found'
                            : 'Forbidden';
            return apiError(error, { status: error.status, message: IS_PROD ? safeMsg : error.message || safeMsg });
        }
        const status = getErrorMessage(error).includes('Unauthorized') ? 401 : 500;
        return apiError(error, { status, message: 'שגיאה ביצירת קישור הזמנה' });
    }
}

export const POST = shabbatGuard(POSTHandler);
