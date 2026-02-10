import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Leave Requests API
 * 
 * Handles CRUD operations for employee leave requests (vacations, sick days, etc.)
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { LeaveRequest, User } from '@/types';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import prisma, { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { assertNoProdEntitlementsBypass, isBypassModuleEntitlementsEnabled, isE2eTestingEnv } from '@/lib/server/workspace';
import { buildLeaveRequestTeamUrl, sendWebPushNotificationToEmails } from '@/lib/server/web-push';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

const IS_PROD = process.env.NODE_ENV === 'production';

function hasFunction(value: unknown, name: string): value is Record<string, (...args: unknown[]) => unknown> {
    const obj = asObject(value);
    const fn = obj?.[name];
    return typeof fn === 'function';
}

async function selectEmailsByUserIdsInOrganization(params: {
    organizationId: string;
    userIds: string[];
}): Promise<string[]> {
    const ids = (Array.isArray(params.userIds) ? params.userIds : []).map((x) => String(x || '').trim()).filter(Boolean);
    if (ids.length === 0) return [];

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.organizationId,
        reason: 'leave_requests_user_emails_lookup',
        query: `
            select lower(email)::text as email
            from nexus_users
            where organization_id = $1::uuid
              and id = any($2::uuid[])
              and email is not null
              and trim(email) <> ''
        `,
        values: [params.organizationId, ids],
    });

    return (Array.isArray(rows) ? rows : [])
        .map((r) => {
            const obj = asObject(r);
            const email = obj ? getString(obj, 'email') : '';
            return String(email || '').trim().toLowerCase();
        })
        .filter(Boolean);
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

function isMissingRelationOrColumnError(error: unknown): boolean {
    const obj = asObject(error) ?? {};
    const code = String(obj['code'] ?? '').toLowerCase();
    const message = String(obj['message'] ?? '').toLowerCase();
    return code === '42p01' || code === '42703' || message.includes('does not exist') || message.includes('relation') || message.includes('column');
}

function toIsoString(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString();
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
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

function isLeaveRequestType(value: string): value is LeaveRequest['leaveType'] {
    return value === 'vacation' || value === 'sick' || value === 'personal' || value === 'unpaid' || value === 'other';
}

function isLeaveRequestStatus(value: string): value is LeaveRequest['status'] {
    return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'cancelled';
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
    findMany: (args: {
        where: Record<string, unknown>;
        orderBy: unknown;
        skip: number;
        take: number;
    }) => Promise<NexusLeaveRequestRow[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<NexusLeaveRequestRow>;
};

function isNexusLeaveRequestsDelegate(value: unknown): value is NexusLeaveRequestsDelegate {
    return asObject(value) !== null && hasFunction(value, 'findMany') && hasFunction(value, 'create');
}

function mapNexusUserRow(row: unknown): User {
    const obj = asObject(row);
    return {
        id: obj ? getString(obj, 'id') : '',
        name: obj ? getString(obj, 'name', getString(obj, 'full_name', getString(obj, 'email'))) : '',
        role: obj ? getString(obj, 'role', 'עובד') : 'עובד',
        department: obj ? (getNullableString(obj, 'department') ?? undefined) : undefined,
        avatar: obj ? getString(obj, 'avatar', getString(obj, 'avatar_url')) : '',
        online: Boolean(obj ? (obj['online'] ?? true) : true),
        capacity: Number(obj ? (obj['capacity'] ?? 0) : 0),
        email: obj ? (getNullableString(obj, 'email') ?? undefined) : undefined,
        phone: obj ? (getNullableString(obj, 'phone') ?? undefined) : undefined,
        location: obj ? (getNullableString(obj, 'location') ?? undefined) : undefined,
        bio: obj ? (getNullableString(obj, 'bio') ?? undefined) : undefined,
        isSuperAdmin: Boolean(obj ? (obj['is_super_admin'] ?? obj['isSuperAdmin'] ?? false) : false),
        managerId: obj ? (getNullableString(obj, 'manager_id') ?? undefined) : undefined,
        managedDepartment: obj ? (getNullableString(obj, 'managed_department') ?? undefined) : undefined,
        tenantId: obj ? (getNullableString(obj, 'organization_id') ?? undefined) : undefined,
    } as User;
}

async function selectUserByIdInOrganization(params: { organizationId: string; userId: string }): Promise<User | null> {
    const userId = String(params.userId || '').trim();
    if (!userId) return null;

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.organizationId,
        reason: 'leave_requests_user_lookup_id',
        query: `
            select
                id::text as id,
                name,
                email,
                role,
                department,
                avatar,
                online,
                capacity,
                phone,
                location,
                bio,
                is_super_admin,
                manager_id::text as manager_id,
                managed_department,
                organization_id::text as organization_id
            from nexus_users
            where organization_id = $1::uuid
              and id = $2::uuid
            limit 1
        `,
        values: [params.organizationId, userId],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    return row ? mapNexusUserRow(row) : null;
}

async function selectDepartmentManagerIdInOrganization(params: {
    organizationId: string;
    department: string;
    excludeUserId?: string;
}): Promise<string | null> {
    const department = String(params.department || '').trim();
    if (!department) return null;

    const excludeUserId = params.excludeUserId ? String(params.excludeUserId).trim() : '';

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.organizationId,
        reason: 'leave_requests_department_manager_lookup',
        query: `
            select id::text as id
            from nexus_users
            where organization_id = $1::uuid
              and managed_department = $2::text
              and ($3::text = '' or id::text <> $3::text)
            limit 1
        `,
        values: [params.organizationId, department, excludeUserId],
    });

    const row = Array.isArray(rows) ? rows[0] : null;
    const obj = asObject(row);
    const id = obj ? getString(obj, 'id') : '';
    return id ? String(id) : null;
}

async function selectTenantAdminIdsInOrganization(params: { organizationId: string; excludeUserId?: string }): Promise<string[]> {
    const roles = ['מנכ״ל', 'מנכ"ל', 'מנכל', 'אדמין'];
    const excludeUserId = params.excludeUserId ? String(params.excludeUserId).trim() : '';

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.organizationId,
        reason: 'leave_requests_admin_list',
        query: `
            select id::text as id
            from nexus_users
            where organization_id = $1::uuid
              and (
                is_super_admin = true
                or role = any($2::text[])
              )
              and ($3::text = '' or id::text <> $3::text)
        `,
        values: [params.organizationId, roles, excludeUserId],
    });

    return (Array.isArray(rows) ? rows : [])
        .map((r) => {
            const obj = asObject(r);
            return obj ? getString(obj, 'id') : '';
        })
        .filter(Boolean);
}

async function ensureUserByEmailInWorkspace(params: { organizationId: string; email: string; authUser: unknown }): Promise<User | null> {
    const email = String(params.email || '').trim().toLowerCase();
    if (!email) return null;

    const existing = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.organizationId,
        reason: 'leave_requests_user_ensure_find',
        query: `
            select
                id::text as id,
                name,
                email,
                role,
                department,
                avatar,
                online,
                capacity,
                phone,
                location,
                bio,
                is_super_admin,
                manager_id::text as manager_id,
                managed_department,
                organization_id::text as organization_id
            from nexus_users
            where organization_id = $1::uuid
              and lower(email) = $2::text
            order by updated_at desc nulls last, created_at desc nulls last
            limit 1
        `,
        values: [params.organizationId, email],
    });

    if (Array.isArray(existing) && existing[0]) {
        return mapNexusUserRow(existing[0]);
    }

    const nowIso = new Date().toISOString();
    const authObj = asObject(params.authUser);
    const firstName = authObj ? getNullableString(authObj, 'firstName') : null;
    const lastName = authObj ? getNullableString(authObj, 'lastName') : null;
    const imageUrl = authObj ? getNullableString(authObj, 'imageUrl') : null;
    const role = authObj ? getNullableString(authObj, 'role') : null;
    const isSuperAdmin = Boolean(authObj ? authObj['isSuperAdmin'] : false);
    const name =
        firstName && lastName
            ? `${firstName} ${lastName}`.trim()
            : firstName || lastName || email;

    const inserted = await queryRawOrgScoped<unknown[]>(prisma, {
        organizationId: params.organizationId,
        reason: 'leave_requests_user_ensure_insert',
        query: `
            insert into nexus_users (
                organization_id,
                name,
                role,
                avatar,
                online,
                capacity,
                email,
                is_super_admin,
                created_at,
                updated_at
            ) values (
                $1::uuid,
                $2::text,
                $3::text,
                $4::text,
                true,
                0,
                $5::text,
                $6::boolean,
                $7::timestamptz,
                $7::timestamptz
            )
            returning
                id::text as id,
                name,
                email,
                role,
                department,
                avatar,
                online,
                capacity,
                phone,
                location,
                bio,
                is_super_admin,
                manager_id::text as manager_id,
                managed_department,
                organization_id::text as organization_id
        `,
        values: [params.organizationId, name, role || 'עובד', imageUrl || null, email, isSuperAdmin, nowIso],
    });

    if (Array.isArray(inserted) && inserted[0]) {
        return mapNexusUserRow(inserted[0]);
    }

    return null;
}

function getLeaveRequestsDelegate(): NexusLeaveRequestsDelegate {
    const prismaObj = asObject(prisma as unknown);
    const delegate = prismaObj ? prismaObj['nexus_leave_requests'] : null;
    if (!isNexusLeaveRequestsDelegate(delegate)) {
        throw new Error('Prisma Client is missing nexus_leave_requests. Run prisma:generate and restart TS server.');
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

async function GETHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId: organizationId } = await getWorkspaceOrThrow(request);

        const allowUnscoped = isBypassModuleEntitlementsEnabled();
        if (allowUnscoped) {
            assertNoProdEntitlementsBypass('api/leave-requests');
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isE2E = isE2eTestingEnv();
        if (allowUnscoped && !isDev && !isE2E) {
            console.error('[Security Risk] allowUnscoped attempted in Production');
            return apiError('Unscoped access forbidden in production', { status: 403 });
        }

        // Get user from database by email
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await ensureUserByEmailInWorkspace({ organizationId, email: user.email, authUser: user });

        if (!dbUser) {
            // Return empty array instead of error - user might not be synced yet
            return apiSuccessCompat({ requests: [] as LeaveRequest[] }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const pageParam = searchParams.get('page');
        const pageSizeParam = searchParams.get('page_size');

        const leaveRequests = getLeaveRequestsDelegate();

        const where: Record<string, unknown> = { organizationId };

        if (!dbUser.isSuperAdmin && !isTenantAdminRole(dbUser.role)) {
            where.employee_id = String(dbUser.id);
        } else if (employeeId) {
            where.employee_id = String(employeeId);
        }

        if (status) {
            where.status = String(status);
        }

        if (startDate) {
            const d = new Date(String(startDate));
            if (!Number.isNaN(d.getTime())) {
                where.start_date = { gte: d };
            }
        }

        if (endDate) {
            const d = new Date(String(endDate));
            if (!Number.isNaN(d.getTime())) {
                where.end_date = { lte: d };
            }
        }

        const page = Math.max(1, Math.floor(Number(pageParam || 1)));
        const pageSize = Math.min(200, Math.max(1, Math.floor(Number(pageSizeParam || 50))));
        const skip = (page - 1) * pageSize;

        const requests = await leaveRequests.findMany({
            where,
            orderBy: [{ created_at: 'desc' }],
            skip,
            take: pageSize + 1,
        });

        const hasMore = Array.isArray(requests) && requests.length > pageSize;
        const trimmed = hasMore ? (requests || []).slice(0, pageSize) : (requests || []);

        // Transform database records to LeaveRequest interface format
        const transformedRequests: LeaveRequest[] = trimmed.map((req) => {
            const leaveTypeRaw = String(req.leave_type);
            const statusRaw = String(req.status);
            return {
                id: req.id,
                tenantId: String(req.organizationId ?? req.organization_id ?? '') || undefined,
                employeeId: String(req.employee_id),
                leaveType: (isLeaveRequestType(leaveTypeRaw) ? leaveTypeRaw : 'other') as LeaveRequest['leaveType'],
                startDate: toIsoString(req.start_date),
                endDate: toIsoString(req.end_date),
                daysRequested: parseFloat(req.days_requested) || 0,
                reason: req.reason ?? undefined,
                status: (isLeaveRequestStatus(statusRaw) ? statusRaw : 'pending') as LeaveRequest['status'],
                requestedBy: req.requested_by ?? undefined,
                approvedBy: req.approved_by ?? undefined,
                approvedAt: req.approved_at ? toIsoString(req.approved_at) : undefined,
                rejectionReason: req.rejection_reason ?? undefined,
                notificationSent: req.notification_sent || false,
                employeeNotified: req.employee_notified || false,
                metadata: normalizeMetadata(req.metadata),
                createdAt: toIsoString(req.created_at),
                updatedAt: toIsoString(req.updated_at),
            };
        });

        return apiSuccessCompat({ requests: transformedRequests, page, pageSize, hasMore }, { status: 200 });

    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        if (IS_PROD) console.error('[API] Error in /api/leave-requests GET');
        else console.error('[API] Error in /api/leave-requests GET:', error);
        if (error instanceof APIError) {
            const safeMsg = error.status === 401 ? 'Unauthorized' : 'Forbidden';
            return apiError(IS_PROD ? safeMsg : error, {
                status: error.status,
                message: IS_PROD ? safeMsg : msg || error.message || safeMsg,
            });
        }
        if (msg.includes('Tenant Isolation') || msg.includes('No tenant scoping column')) {
            if (!ALLOW_SCHEMA_FALLBACKS) {
                return apiError(error, {
                    status: 500,
                    message: `[SchemaMismatch] leave-requests query failed (${msg || 'missing tenant scoping column'})`,
                });
            }
            return apiSuccessCompat({ requests: [] as LeaveRequest[] }, { status: 200 });
        }
        const safeMsg = 'שגיאה בטעינת בקשות חופש';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: IS_PROD ? safeMsg : msg || safeMsg,
        });
    }
}

async function POSTHandler(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        const { workspaceId: organizationId, orgKey } = await getWorkspaceOrThrow(request);

        // Get user from database by email
        if (!user.email) {
            return apiError('User email not found', { status: 400 });
        }

        const dbUser = await ensureUserByEmailInWorkspace({ organizationId, email: user.email, authUser: user });

        if (!dbUser) {
            return apiError('User not found in database. Please sync your account first.', { status: 404 });
        }

        const body = (await request.json()) as unknown;
        const bodyObj = asObject(body) ?? {};
        const employeeId = bodyObj['employeeId'] ? String(bodyObj['employeeId']) : String(dbUser.id);
        const leaveType = bodyObj['leaveType'];
        const startDate = bodyObj['startDate'];
        const endDate = bodyObj['endDate'];
        const daysRequested = bodyObj['daysRequested'];
        const reason = bodyObj['reason'];
        const metadata = bodyObj['metadata'];

        // Validation
        if (!leaveType || !startDate || !endDate || daysRequested === undefined) {
            return apiError('סוג חופש, תאריכים ומספר ימים נדרשים', { status: 400 });
        }

        // Check if user can request for this employee (must be self or admin)
        if (employeeId !== dbUser.id) {
            const isAdmin = dbUser.isSuperAdmin || isTenantAdminRole(dbUser.role);
            if (!isAdmin) {
                return apiError('אין הרשאה ליצור בקשה עבור עובד אחר', { status: 403 });
            }
        }

        // Calculate days if not provided
        let calculatedDays = daysRequested as unknown;
        if (!calculatedDays) {
            const start = new Date(String(startDate));
            const end = new Date(String(endDate));
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
            calculatedDays = diffDays;
        }

        // Merge metadata - ensure isUrgent is preserved if provided
        const metadataObj = asObject(metadata) ?? {};
        const finalMetadata = {
            ...metadataObj,
            ...(metadataObj['isUrgent'] !== undefined ? { isUrgent: metadataObj['isUrgent'] } : {})
        };

        // Create leave request
        const leaveRequests = getLeaveRequestsDelegate();

        const start = new Date(String(startDate));
        const end = new Date(String(endDate));
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return apiError('תאריכים לא תקינים', { status: 400 });
        }

        const leaveRequest = await leaveRequests.create({
            data: {
                organizationId,
                employee_id: String(employeeId),
                leave_type: String(leaveType),
                start_date: start,
                end_date: end,
                days_requested: new Prisma.Decimal(String(calculatedDays)),
                reason: reason ?? null,
                status: 'pending',
                requested_by: String(dbUser.id),
                metadata: finalMetadata,
            },
        });

        // Transform to LeaveRequest interface format
        const leaveTypeRaw = String(leaveRequest.leave_type);
        const statusRaw = String(leaveRequest.status);
        const transformedRequest: LeaveRequest = {
            id: leaveRequest.id,
            tenantId: String(leaveRequest.organizationId ?? leaveRequest.organization_id ?? '') || undefined,
            employeeId: leaveRequest.employee_id,
            leaveType: (isLeaveRequestType(leaveTypeRaw) ? leaveTypeRaw : 'other') as LeaveRequest['leaveType'],
            startDate: toIsoString(leaveRequest.start_date),
            endDate: toIsoString(leaveRequest.end_date),
            daysRequested: parseFloat(leaveRequest.days_requested) || 0,
            reason: leaveRequest.reason ?? undefined,
            status: (isLeaveRequestStatus(statusRaw) ? statusRaw : 'pending') as LeaveRequest['status'],
            requestedBy: leaveRequest.requested_by ?? undefined,
            approvedBy: leaveRequest.approved_by ?? undefined,
            approvedAt: leaveRequest.approved_at ? toIsoString(leaveRequest.approved_at) : undefined,
            rejectionReason: leaveRequest.rejection_reason ?? undefined,
            notificationSent: leaveRequest.notification_sent || false,
            employeeNotified: leaveRequest.employee_notified || false,
            metadata: normalizeMetadata(leaveRequest.metadata),
            createdAt: toIsoString(leaveRequest.created_at),
            updatedAt: toIsoString(leaveRequest.updated_at)
        };

        // Send notification to manager/department head
        try {
            // Get the employee who requested leave
            const employee = await selectUserByIdInOrganization({ organizationId, userId: employeeId });
            
            if (employee) {
                // Find managers to notify
                let managersToNotify: string[] = [];
                
                // 1. Direct manager (if exists)
                if (employee.managerId) {
                    managersToNotify.push(employee.managerId);
                }
                
                // 2. Department manager (if employee has a department)
                if (employee.department) {
                    const deptManagerId = await selectDepartmentManagerIdInOrganization({
                        organizationId,
                        department: employee.department,
                        excludeUserId: employeeId,
                    });
                    if (deptManagerId && !managersToNotify.includes(deptManagerId)) {
                        managersToNotify.push(deptManagerId);
                    }
                }
                
                // 3. Super admins (if no specific manager found)
                // But exclude the employee themselves if they are a super admin/CEO
                if (managersToNotify.length === 0) {
                    const adminIds = await selectTenantAdminIdsInOrganization({
                        organizationId,
                        excludeUserId: employeeId,
                    });
                    managersToNotify.push(...adminIds);
                } else {
                    // Even if we have managers, filter out the employee themselves
                    managersToNotify = managersToNotify.filter(id => id !== employeeId);
                }
                
                // Get leave type label
                const leaveTypeLabels: Record<string, string> = {
                    'vacation': 'חופשה',
                    'sick': 'מחלה',
                    'personal': 'יום אישי',
                    'unpaid': 'חופשה ללא תשלום',
                    'other': 'אחר'
                };
                const leaveTypeStr = String(leaveType);
                const leaveTypeLabel = leaveTypeLabels[leaveTypeStr] || leaveTypeStr;
                
                // Create notifications
                if (managersToNotify.length > 0) {
                    const isUrgent = Boolean((finalMetadata as Record<string, unknown>)['isUrgent'] || false);
                    const urgentLabel = isUrgent ? ' [דחוף!]' : '';
                    
                    const notifications = managersToNotify.map(managerId => ({
                        organization_id: organizationId,
                        recipient_id: managerId,
                        type: 'leave_request',
                        text: `בקשת חופש חדשה${urgentLabel}: ${employee.name} - ${leaveTypeLabel} (${startDate} עד ${endDate})`,
                        actor_id: employeeId,
                        actor_name: employee.name,
                        related_id: leaveRequest.id,
                        is_read: false,
                        metadata: {
                            leaveRequestId: leaveRequest.id,
                            employeeId: employeeId,
                            employeeName: employee.name,
                            leaveType: leaveTypeStr,
                            startDate: startDate,
                            endDate: endDate,
                            daysRequested: calculatedDays,
                            isUrgent: isUrgent,
                            requiresPushNotification: isUrgent // Flag for push notification
                        },
                        created_at: new Date().toISOString()
                    }));
                    
                    try {
                        await insertNotifications({ workspaceId: organizationId, notifications });
                    } catch (e: unknown) {
                        if (isMissingRelationOrColumnError(e) && !ALLOW_SCHEMA_FALLBACKS) {
                            throw new Error(`[SchemaMismatch] misrad_notifications insert failed (${getErrorMessage(e) || 'missing relation'})`);
                        }
                        if (IS_PROD) console.warn('[API] Could not create notifications');
                        else console.warn('[API] Could not create notifications:', e);
                    }

                    // Web Push (PWA) - only for urgent requests
                    if (isUrgent) {
                        try {
                            const recipientEmails = await selectEmailsByUserIdsInOrganization({
                                organizationId,
                                userIds: managersToNotify,
                            });

                            if (recipientEmails.length > 0) {
                                await sendWebPushNotificationToEmails({
                                    organizationId,
                                    emails: recipientEmails,
                                    payload: {
                                        title: 'בקשת חופש דחופה',
                                        body: `${employee.name} - ${leaveTypeLabel} (${startDate} עד ${endDate})`,
                                        url: buildLeaveRequestTeamUrl({ orgSlug: String(orgKey || '') }),
                                        tag: `leave-request-${String(leaveRequest.id)}`,
                                        category: 'alerts',
                                    },
                                });
                            }
                        } catch (pushError) {
                            if (IS_PROD) console.warn('[API] Could not send web push (ignored)');
                            else console.warn('[API] Could not send web push (ignored):', pushError);
                        }
                    }
                }
            }
        } catch (notifError: unknown) {
            if (getErrorMessage(notifError).includes('[SchemaMismatch]')) {
                throw notifError;
            }
            if (IS_PROD) console.warn('[API] Error sending notifications for leave request');
            else console.warn('[API] Error sending notifications for leave request:', notifError);
            // Don't fail the request if notification fails
        }

        return apiSuccessCompat(
            { request: transformedRequest, message: 'בקשת חופש נוצרה בהצלחה' },
            { status: 201 }
        );

    } catch (error: unknown) {
        if (IS_PROD) console.error('[API] Error in /api/leave-requests POST');
        else console.error('[API] Error in /api/leave-requests POST:', error);
        if (error instanceof APIError) {
            return apiError(error, { status: error.status, message: error.message || 'Forbidden' });
        }
        const msg = getErrorMessage(error);
        const safeMsg = 'שגיאה ביצירת בקשת חופש';
        return apiError(IS_PROD ? safeMsg : error, {
            status: msg.includes('Unauthorized') ? 401 : 500,
            message: IS_PROD ? safeMsg : msg || safeMsg,
        });
    }
}

export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
