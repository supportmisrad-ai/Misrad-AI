import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Leave Request by ID API
 * 
 * Handles update and delete operations for specific leave requests
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { LeaveRequest } from '@/types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import prisma, { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

function hasFunction(value: unknown, name: string): value is Record<string, (...args: unknown[]) => unknown> {
    const obj = asObject(value);
    const fn = obj?.[name];
    return typeof fn === 'function';
}

function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
    const v = obj[key];
    return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
}

function toIsoString(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString();
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function isLeaveRequestType(value: string): value is LeaveRequest['leaveType'] {
    return value === 'vacation' || value === 'sick' || value === 'personal' || value === 'unpaid' || value === 'other';
}

function isLeaveRequestStatus(value: string): value is LeaveRequest['status'] {
    return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'cancelled';
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            return asObject(parsed) ?? {};
        } catch {
            return {};
        }
    }
    return asObject(value) ?? {};
}

type NexusUserLite = {
    id: string;
    name: string;
    role: string;
    department?: string;
    managerId?: string;
    managedDepartment?: string;
    isSuperAdmin: boolean;
    tenantId?: string;
};

type NexusLeaveRequestRow = {
    id: string;
    organizationId?: string;
    organization_id?: string;
    employee_id: string;
    leave_type: string;
    start_date: Date;
    end_date: Date;
    days_requested: string;
    reason: string | null;
    status: string;
    requested_by: string | null;
    approved_by: string | null;
    approved_at: Date | null;
    rejection_reason: string | null;
    notification_sent: boolean | null;
    employee_notified: boolean | null;
    metadata: unknown;
    created_at: Date;
    updated_at: Date;
};

type NexusLeaveRequestsDelegate = {
    findFirst: (args: { where: { id: string; organizationId: string } }) => Promise<NexusLeaveRequestRow | null>;
    updateMany: (args: { where: { id: string; organizationId: string }; data: Record<string, unknown> }) => Promise<{ count: number }>;
    deleteMany: (args: { where: { id: string; organizationId: string } }) => Promise<{ count: number }>;
};

function isNexusLeaveRequestsDelegate(value: unknown): value is NexusLeaveRequestsDelegate {
    return (
        asObject(value) !== null &&
        hasFunction(value, 'findFirst') &&
        hasFunction(value, 'updateMany') &&
        hasFunction(value, 'deleteMany')
    );
}

type NotificationInsert = {
    organization_id: string;
    recipient_id: string;
    type: string;
    text: string;
    actor_id?: string | null;
    actor_name?: string | null;
    related_id?: string | null;
    is_read?: boolean;
    metadata?: unknown;
    created_at?: string;
};

type LeaveRequestUpdateData = {
    leave_type?: unknown;
    start_date?: unknown;
    end_date?: unknown;
    days_requested?: unknown;
    reason?: unknown;
    status?: string;
    rejection_reason?: unknown;
    approved_by?: string;
    approved_at?: string;
    employee_notified?: boolean;
    metadata?: Record<string, unknown>;
    requestMoreInfo?: boolean;
};

function mapNexusUserRow(row: unknown): NexusUserLite {
    const obj = asObject(row);
    return {
        id: obj ? getString(obj, 'id') : '',
        name: obj ? getString(obj, 'name', getString(obj, 'full_name', getString(obj, 'email'))) : '',
        role: obj ? getString(obj, 'role', 'עובד') : 'עובד',
        department: obj ? (getNullableString(obj, 'department') ?? undefined) : undefined,
        managerId: obj ? (getNullableString(obj, 'manager_id') ?? getNullableString(obj, 'managerId') ?? undefined) : undefined,
        managedDepartment: obj
            ? (getNullableString(obj, 'managed_department') ?? getNullableString(obj, 'managedDepartment') ?? undefined)
            : undefined,
        isSuperAdmin: Boolean(obj ? (obj['is_super_admin'] ?? obj['isSuperAdmin'] ?? false) : false),
        tenantId: obj ? (getNullableString(obj, 'organization_id') ?? undefined) : undefined,
    };
}

async function selectUserByEmailAndWorkspace(params: { email: string; workspaceId: string }): Promise<NexusUserLite | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'leave_requests_user_lookup_email',
        query: `
            select
                id::text as id,
                name,
                email,
                role,
                department,
                manager_id::text as manager_id,
                managed_department,
                is_super_admin,
                organization_id::text as organization_id
            from nexus_users
            where lower(email) = $1::text
              and organization_id = $2::uuid
            order by updated_at desc nulls last, created_at desc nulls last
            limit 1
        `,
        values: [email, params.workspaceId],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    return row ? mapNexusUserRow(row) : null;
}

async function selectUserByIdInWorkspace(params: { userId: string; workspaceId: string }): Promise<NexusUserLite | null> {
    const userId = String(params.userId || '').trim();
    if (!userId) return null;

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'leave_requests_user_lookup_id',
        query: `
            select
                id::text as id,
                name,
                email,
                role,
                department,
                manager_id::text as manager_id,
                managed_department,
                is_super_admin,
                organization_id::text as organization_id
            from nexus_users
            where organization_id = $1::uuid
              and id = $2::uuid
            limit 1
        `,
        values: [params.workspaceId, userId],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    return row ? mapNexusUserRow(row) : null;
}

async function selectDepartmentManagerIdInWorkspace(params: {
    workspaceId: string;
    department: string;
    excludeUserId?: string;
}): Promise<string | null> {
    const department = String(params.department || '').trim();
    if (!department) return null;

    const excludeUserId = params.excludeUserId ? String(params.excludeUserId).trim() : '';

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'leave_requests_department_manager_lookup',
        query: `
            select id::text as id
            from nexus_users
            where organization_id = $1::uuid
              and managed_department = $2::text
              and ($3::text = '' or id::text <> $3::text)
            limit 1
        `,
        values: [params.workspaceId, department, excludeUserId],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    const obj = asObject(row);
    const id = obj ? getString(obj, 'id') : '';
    return id ? String(id) : null;
}

async function selectSuperAdminIdsInWorkspace(params: { workspaceId: string }): Promise<string[]> {
    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.workspaceId,
        reason: 'leave_requests_super_admin_list',
        query: `
            select id::text as id
            from nexus_users
            where organization_id = $1::uuid
              and is_super_admin = true
        `,
        values: [params.workspaceId],
    });

    return (Array.isArray(rows) ? rows : [])
        .map((r) => {
            const obj = asObject(r);
            return obj ? getString(obj, 'id') : '';
        })
        .filter(Boolean);
}

function getLeaveRequestsDelegate(): NexusLeaveRequestsDelegate {
    const prismaObj = asObject(prisma as unknown);
    const delegate = prismaObj ? prismaObj['nexus_leave_requests'] : null;
    if (!isNexusLeaveRequestsDelegate(delegate)) {
        throw new Error(
            'Prisma Client is missing nexus_leave_requests. Run Prisma generate (npm run prisma:generate) and restart the TS server.'
        );
    }
    return delegate;
}

async function insertNotifications(params: { workspaceId: string; notifications: NotificationInsert[] }) {
    const list = Array.isArray(params.notifications) ? params.notifications : [];
    if (list.length === 0) return;

    const columns =
        '(organization_id, recipient_id, type, text, actor_id, actor_name, related_id, is_read, metadata, created_at, updated_at)';

    const values: unknown[] = [];
    const tuples: string[] = [];
    let i = 1;

    for (const n of list) {
        const obj = asObject(n) ?? {};
        const metadata = normalizeMetadata(obj['metadata']);
        const createdAt = obj['created_at'] ? String(obj['created_at']) : new Date().toISOString();
        tuples.push(
            `($${i++}::uuid,$${i++}::uuid,$${i++}::text,$${i++}::text,$${i++}::uuid,$${i++}::text,$${i++}::uuid,$${i++}::boolean,$${i++}::jsonb,$${i++}::timestamptz,$${i++}::timestamptz)`
        );
        values.push(
            getString(obj, 'organization_id'),
            getString(obj, 'recipient_id'),
            getString(obj, 'type'),
            getString(obj, 'text'),
            getNullableString(obj, 'actor_id'),
            getNullableString(obj, 'actor_name'),
            getNullableString(obj, 'related_id'),
            Boolean(obj['is_read']),
            metadata,
            createdAt,
            createdAt
        );
    }

    await executeRawOrgScoped(prisma, {
        organizationId: params.workspaceId,
        reason: 'leave_requests_notifications_insert',
        query: `insert into misrad_notifications ${columns} values ${tuples.join(',')}`,
        values,
    });
}

async function PATCHHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const { workspaceId } = await getWorkspaceOrThrow(request);

        const { id } = params;

        if (!id) {
            return apiError('Request ID is required', { status: 400 });
        }

        const leaveRequests = getLeaveRequestsDelegate();

        const existingRequest = await leaveRequests.findFirst({
            where: { id: String(id), organizationId: workspaceId },
        });

        if (!existingRequest) {
            return apiError('בקשת חופש לא נמצאה', { status: 404 });
        }

        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserByEmailAndWorkspace({ email: user.email, workspaceId });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        const isEmployee = String(existingRequest.employee_id) === String(dbUser.id);
        const isAdmin = Boolean(dbUser.isSuperAdmin) || isTenantAdminRole(String(dbUser.role || ''));

        const body = (await request.json()) as unknown;
        const bodyObj = asObject(body) ?? {};
        const updateData: LeaveRequestUpdateData = {};

        if (isEmployee && existingRequest.status === 'pending') {
            if (bodyObj['leaveType'] !== undefined) updateData.leave_type = bodyObj['leaveType'];
            if (bodyObj['startDate'] !== undefined) updateData.start_date = bodyObj['startDate'];
            if (bodyObj['endDate'] !== undefined) updateData.end_date = bodyObj['endDate'];
            if (bodyObj['daysRequested'] !== undefined) updateData.days_requested = bodyObj['daysRequested'];
            if (bodyObj['reason'] !== undefined) updateData.reason = bodyObj['reason'];
            if (String(bodyObj['status'] ?? '') === 'cancelled') {
                updateData.status = 'cancelled';
            }
            if (bodyObj['metadata'] !== undefined) {
                const existingMetadata = normalizeMetadata(existingRequest.metadata);
                const incoming = asObject(bodyObj['metadata']) ?? {};
                updateData.metadata = {
                    ...existingMetadata,
                    ...incoming
                };
            }
        }

        if (isAdmin) {
            const nextStatus = String(bodyObj['status'] ?? '');
            if (nextStatus === 'approved' || nextStatus === 'rejected') {
                updateData.status = nextStatus;
                updateData.approved_by = dbUser.id;
                updateData.approved_at = new Date().toISOString();
                updateData.employee_notified = false;

                if (nextStatus === 'rejected' && bodyObj['rejectionReason']) {
                    updateData.rejection_reason = bodyObj['rejectionReason'];
                }
            }
            if (bodyObj['requestMoreInfo'] === true) {
                const existingMetadata = normalizeMetadata(existingRequest.metadata);
                updateData.metadata = {
                    ...existingMetadata,
                    needsMoreInfo: true,
                    requestedMoreInfoBy: dbUser.id,
                    requestedMoreInfoAt: new Date().toISOString(),
                    moreInfoRequest: String(bodyObj['moreInfoRequest'] ?? '') || 'נא לספק סיבה מפורטת יותר לבקשת החופש'
                };
            }
        }

        if (Object.keys(updateData).length === 0) {
            return apiError('אין שינויים לעדכון', { status: 400 });
        }

        const prismaUpdateData: Record<string, unknown> & {
            start_date?: unknown;
            end_date?: unknown;
            approved_at?: unknown;
        } = { ...updateData };

        if (prismaUpdateData.start_date !== undefined) {
            const d = new Date(String(prismaUpdateData.start_date));
            if (Number.isNaN(d.getTime())) {
                return apiError('תאריך התחלה לא תקין', { status: 400 });
            }
            prismaUpdateData.start_date = d;
        }

        if (prismaUpdateData.end_date !== undefined) {
            const d = new Date(String(prismaUpdateData.end_date));
            if (Number.isNaN(d.getTime())) {
                return apiError('תאריך סיום לא תקין', { status: 400 });
            }
            prismaUpdateData.end_date = d;
        }

        if (prismaUpdateData.approved_at !== undefined) {
            // Prisma expects Date for DateTime columns
            prismaUpdateData.approved_at = new Date();
        }

        const updateRes = await leaveRequests.updateMany({
            where: { id: String(id), organizationId: workspaceId },
            data: prismaUpdateData,
        });

        if (!updateRes?.count) {
            return apiError('שגיאה בעדכון בקשת חופש', { status: 500 });
        }

        const updatedRequest = await leaveRequests.findFirst({
            where: { id: String(id), organizationId: workspaceId },
        });

        if (!updatedRequest) {
            return apiError('שגיאה בעדכון בקשת חופש', { status: 500 });
        }

        const leaveTypeRaw = String(updatedRequest.leave_type);
        const statusRaw = String(updatedRequest.status);

        const transformedRequest: LeaveRequest = {
            id: updatedRequest.id,
            tenantId: String(updatedRequest.organizationId ?? updatedRequest.organization_id ?? ''),
            employeeId: updatedRequest.employee_id,
            leaveType: (isLeaveRequestType(leaveTypeRaw) ? leaveTypeRaw : 'other') as LeaveRequest['leaveType'],
            startDate: toIsoString(updatedRequest.start_date),
            endDate: toIsoString(updatedRequest.end_date),
            daysRequested: parseFloat(updatedRequest.days_requested) || 0,
            reason: updatedRequest.reason ?? undefined,
            status: (isLeaveRequestStatus(statusRaw) ? statusRaw : 'pending') as LeaveRequest['status'],
            requestedBy: updatedRequest.requested_by ?? undefined,
            approvedBy: updatedRequest.approved_by ?? undefined,
            approvedAt: updatedRequest.approved_at ? toIsoString(updatedRequest.approved_at) : undefined,
            rejectionReason: updatedRequest.rejection_reason ?? undefined,
            notificationSent: updatedRequest.notification_sent || false,
            employeeNotified: updatedRequest.employee_notified || false,
            metadata: normalizeMetadata(updatedRequest.metadata),
            createdAt: toIsoString(updatedRequest.created_at),
            updatedAt: toIsoString(updatedRequest.updated_at)
        };

        try {
            const employee = await selectUserByIdInWorkspace({ workspaceId, userId: existingRequest.employee_id });

            if (isEmployee && employee) {
                if (updateData.status === 'cancelled') {
                    const managersToNotify: string[] = [];

                    if (employee.managerId) {
                        managersToNotify.push(employee.managerId);
                    }

                    if (employee.department) {
                        const deptManagerId = await selectDepartmentManagerIdInWorkspace({
                            workspaceId,
                            department: employee.department,
                            excludeUserId: employee.id,
                        });
                        if (deptManagerId && !managersToNotify.includes(deptManagerId)) {
                            managersToNotify.push(deptManagerId);
                        }
                    }

                    if (managersToNotify.length === 0) {
                        const superAdminIds = await selectSuperAdminIdsInWorkspace({ workspaceId });
                        managersToNotify.push(...superAdminIds);
                    }

                    if (managersToNotify.length > 0) {
                        const notifications = managersToNotify.map(managerId => ({
                            organization_id: workspaceId,
                            recipient_id: managerId,
                            type: 'leave_request_cancelled',
                            text: `${employee.name} ביטל את בקשת החופש שלו`,
                            actor_id: employee.id,
                            actor_name: employee.name,
                            related_id: id,
                            is_read: false,
                            metadata: {
                                leaveRequestId: id,
                                employeeId: employee.id,
                                employeeName: employee.name,
                                leaveType: existingRequest.leave_type,
                            },
                            created_at: new Date().toISOString()
                        }));

                        try {
                            await insertNotifications({ workspaceId, notifications });
                        } catch (e: unknown) {
                            if (IS_PROD) console.warn('[API] Could not create cancellation notifications');
                            else console.warn('[API] Could not create cancellation notifications:', e);
                        }
                    }
                } else if (!updateData.status && (updateData.start_date || updateData.end_date || updateData.leave_type || updateData.reason)) {
                    const managersToNotify: string[] = [];

                    if (employee.managerId) {
                        managersToNotify.push(employee.managerId);
                    }

                    if (employee.department) {
                        const deptManagerId = await selectDepartmentManagerIdInWorkspace({
                            workspaceId,
                            department: employee.department,
                            excludeUserId: employee.id,
                        });
                        if (deptManagerId && !managersToNotify.includes(deptManagerId)) {
                            managersToNotify.push(deptManagerId);
                        }
                    }

                    if (managersToNotify.length === 0) {
                        const superAdminIds = await selectSuperAdminIdsInWorkspace({ workspaceId });
                        managersToNotify.push(...superAdminIds);
                    }

                    if (managersToNotify.length > 0) {
                        const notifications = managersToNotify.map(managerId => ({
                            organization_id: workspaceId,
                            recipient_id: managerId,
                            type: 'leave_request_updated',
                            text: `${employee.name} עדכן את בקשת החופש שלו`,
                            actor_id: employee.id,
                            actor_name: employee.name,
                            related_id: id,
                            is_read: false,
                            metadata: {
                                leaveRequestId: id,
                                employeeId: employee.id,
                                employeeName: employee.name,
                                changes: updateData
                            },
                            created_at: new Date().toISOString()
                        }));

                        try {
                            await insertNotifications({ workspaceId, notifications });
                        } catch (e: unknown) {
                            if (IS_PROD) console.warn('[API] Could not create update notifications');
                            else console.warn('[API] Could not create update notifications:', e);
                        }
                    }
                }
            }

            if (Boolean(updateData.metadata?.needsMoreInfo) && isAdmin) {
                if (employee) {
                    const moreInfoRequest = String(updateData.metadata?.moreInfoRequest ?? '') || 'נא לספק סיבה מפורטת יותר';
                    const notification = {
                        organization_id: workspaceId,
                        recipient_id: existingRequest.employee_id,
                        type: 'leave_request',
                        text: `המנהל מבקש מידע נוסף על בקשת החופש שלך: ${moreInfoRequest}`,
                        actor_id: dbUser.id,
                        actor_name: dbUser.name,
                        related_id: id,
                        is_read: false,
                        metadata: {
                            leaveRequestId: id,
                            action: 'request_more_info',
                            moreInfoRequest: moreInfoRequest
                        },
                        created_at: new Date().toISOString()
                    };

                    try {
                        await insertNotifications({ workspaceId, notifications: [notification] });
                    } catch (e: unknown) {
                        if (IS_PROD) console.warn('[API] Could not create more info request notification');
                        else console.warn('[API] Could not create more info request notification:', e);
                    }
                }
            }

            if (updateData.status && updateData.status !== existingRequest.status && isAdmin) {
                if (employee) {
                    const statusLabels: Record<string, string> = {
                        'approved': 'אושרה',
                        'rejected': 'נדחתה',
                        'cancelled': 'בוטלה'
                    };
                    const statusLabel = statusLabels[updateData.status] || updateData.status;

                    const notification = {
                        organization_id: workspaceId,
                        recipient_id: existingRequest.employee_id,
                        type: 'leave_request_status',
                        text: `בקשת החופש שלך ${statusLabel}`,
                        actor_id: dbUser.id,
                        actor_name: dbUser.name,
                        related_id: id,
                        is_read: false,
                        metadata: {
                            leaveRequestId: id,
                            status: updateData.status,
                            rejectionReason: updateData.rejection_reason
                        },
                        created_at: new Date().toISOString()
                    };

                    try {
                        await insertNotifications({ workspaceId, notifications: [notification] });
                        await leaveRequests.updateMany({
                            where: { id: String(id), organizationId: workspaceId },
                            data: { employee_notified: true },
                        });
                    } catch (e: unknown) {
                        if (IS_PROD) console.warn('[API] Could not create notification for employee');
                        else console.warn('[API] Could not create notification for employee:', e);
                    }
                }
            }
        } catch (notifError) {
            if (IS_PROD) console.warn('[API] Error sending notifications');
            else console.warn('[API] Error sending notifications:', notifError);
        }

        return apiSuccessCompat(
            { request: transformedRequest, message: 'בקשת חופש עודכנה בהצלחה' },
            { status: 200 }
        );
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/leave-requests/[id] PATCH');
        else console.error('[API] Error in /api/leave-requests/[id] PATCH:', error);
        if (error instanceof APIError) {
            const safeMsg =
                error.status === 400
                    ? 'Bad request'
                    : error.status === 401
                      ? 'Unauthorized'
                      : error.status === 404
                        ? 'Not found'
                        : error.status === 500
                          ? 'Internal server error'
                          : 'Forbidden';
            return apiError(error, {
                status: error.status,
                message: IS_PROD ? safeMsg : error.message || safeMsg,
            });
        }
        const obj = asObject(error);
        const status =
            (obj && typeof obj['status'] === 'number' ? (obj['status'] as number) : null) ??
            (getErrorMessage(error).includes('Unauthorized') ? 401 : 500);
        const safeMsg = 'שגיאה בעדכון בקשת חופש';
        return apiError(IS_PROD ? safeMsg : error, {
            status,
            message: safeMsg,
        });
    }
}

async function DELETEHandler(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId } = await getWorkspaceOrThrow(request);

        const { id } = await params;

        if (!id) {
            return apiError('Request ID is required', { status: 400 });
        }

        const leaveRequests = getLeaveRequestsDelegate();

        const existingRequest = await leaveRequests.findFirst({
            where: { id: String(id), organizationId: workspaceId },
        });

        if (!existingRequest) {
            return apiError('בקשת חופש לא נמצאה', { status: 404 });
        }

        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await selectUserByEmailAndWorkspace({ email: user.email, workspaceId });

        if (!dbUser) {
            return apiError('User not found in database', { status: 404 });
        }

        const isEmployee = String(existingRequest.employee_id) === String(dbUser.id);
        const isAdmin = Boolean(dbUser.isSuperAdmin) || isTenantAdminRole(String(dbUser.role || ''));

        if (!isEmployee && !isAdmin) {
            return apiError('אין הרשאה למחוק בקשת חופש זו', { status: 403 });
        }

        // Only allow deletion of approved requests for admins
        if (String(existingRequest.status || '') === 'approved' && !isAdmin) {
            return apiError('לא ניתן למחוק בקשת חופש מאושרת', { status: 400 });
        }

        const delRes = await leaveRequests.deleteMany({
            where: { id: String(id), organizationId: workspaceId },
        });

        if (!delRes?.count) {
            return apiError('שגיאה במחיקת בקשת חופש', { status: 500 });
        }

        // Send notification to managers if employee deleted their own request
        if (isEmployee) {
            try {
                const employee = await selectUserByIdInWorkspace({
                    workspaceId,
                    userId: existingRequest.employee_id,
                });

                if (employee) {
                    const managersToNotify: string[] = [];

                    if (employee.managerId) {
                        managersToNotify.push(String(employee.managerId));
                    }

                    if (employee.department) {
                        const deptManagerId = await selectDepartmentManagerIdInWorkspace({
                            workspaceId,
                            department: employee.department,
                            excludeUserId: employee.id,
                        });
                        if (deptManagerId && !managersToNotify.includes(deptManagerId)) {
                            managersToNotify.push(deptManagerId);
                        }
                    }

                    if (managersToNotify.length === 0) {
                        const superAdminIds = await selectSuperAdminIdsInWorkspace({ workspaceId });
                        managersToNotify.push(...superAdminIds);
                    }

                    if (managersToNotify.length > 0) {
                        const notifications = managersToNotify.map((managerId) => ({
                            organization_id: workspaceId,
                            recipient_id: managerId,
                            type: 'leave_request_deleted',
                            text: `${employee.name} מחק את בקשת החופש שלו`,
                            actor_id: employee.id,
                            actor_name: employee.name,
                            related_id: id,
                            is_read: false,
                            metadata: {
                                leaveRequestId: id,
                                employeeId: employee.id,
                                employeeName: employee.name,
                                leaveType: existingRequest.leave_type,
                                startDate: existingRequest.start_date,
                                endDate: existingRequest.end_date,
                                status: existingRequest.status,
                            },
                            created_at: new Date().toISOString(),
                        }));

                        try {
                            await insertNotifications({ workspaceId, notifications });
                        } catch (e: unknown) {
                            if (IS_PROD) console.warn('[API] Could not create deletion notifications');
                            else console.warn('[API] Could not create deletion notifications:', e);
                        }
                    }
                }
            } catch (notifError) {
                if (IS_PROD) console.warn('[API] Error sending deletion notifications');
                else console.warn('[API] Error sending deletion notifications:', notifError);
            }
        }

        return apiSuccessCompat(
            { message: 'בקשת חופש נמחקה בהצלחה' },
            { status: 200 }
        );
    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/leave-requests/[id] DELETE');
        else console.error('[API] Error in /api/leave-requests/[id] DELETE:', error);
        const message = getErrorMessage(error);
        const safeMsg = 'שגיאה במחיקת בקשת חופש';
        return apiError(IS_PROD ? safeMsg : error, {
            status: message.includes('Unauthorized') ? 401 : 500,
            message: safeMsg,
        });
    }
}

export const PATCH = shabbatGuard(PATCHHandler);

export const DELETE = shabbatGuard(DELETEHandler);
