import prisma from '@/lib/prisma';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';

type UnknownRecord = Record<string, unknown>;

type User = { id: string } & UnknownRecord;
type Task = { id: string } & UnknownRecord;
type TimeEntry = { id: string } & UnknownRecord;
type Client = { id: string } & UnknownRecord;
type Tenant = { id: string } & UnknownRecord;

type PermissionId = string;

type RoleDefinition = {
    id: string;
    name: string;
    description?: string | null;
    permissions?: PermissionId[];
} & UnknownRecord;

function getErrorCode(error: unknown): string | null {
    const obj = asObject(error);
    const code = obj?.code;
    return typeof code === 'string' ? code : null;
}

function parseOptionalFloat(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    const n = parseFloat(String(value));
    return Number.isFinite(n) ? n : undefined;
}

export type GlobalUserLookup = {
    id: string;
    email: string;
    organizationId: string | null;
};

function legacyBlocked(context: string): never {
    throw new Error(
        `[DB] ${context}: Legacy Supabase DB layer is disabled (Prisma-first Tenant Isolation). ` +
            `Use Prisma delegates / server API routes instead.`
    );
}

export async function findUserGlobalByEmail(email: string): Promise<GlobalUserLookup | null> {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return null;
    }

    const rows = await prisma.nexusUser.findMany({
        where: { email: normalizedEmail },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 2,
        select: { id: true, email: true, organizationId: true },
    });

    if (rows.length > 1) {
        console.warn('[DB] findUserGlobalByEmail: duplicate rows for email', {
            email: normalizedEmail,
            ids: rows.map((r) => String(r.id)),
        });
    }

    const row = rows[0];
    if (!row?.id) return null;

    return {
        id: String(row.id),
        email: String(row.email || normalizedEmail),
        organizationId: row.organizationId ? String(row.organizationId) : null,
    };
}

export async function initDatabase(): Promise<void> {
    return;
}

/**
 * Get users from database
 */
export async function getUsers(filters?: {
    userId?: string;
    userIds?: string[];
    department?: string;
    role?: string;
    email?: string;
    organizationId?: string;
    tenantId?: string;
    allowUnscoped?: boolean;
    page?: number;
    pageSize?: number;
}): Promise<User[]> {
    return legacyBlocked('getUsers');
}

/**
 * Get tasks from database
 */
export async function getTasks(filters?: {
    taskId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
    clientId?: string;
    organizationId?: string;
    tenantId?: string;
}): Promise<Task[]> {
    return legacyBlocked('getTasks');
}

export async function getTimeEntries(filters?: {
    entryId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    organizationId?: string;
    tenantId?: string;
    page?: number;
    pageSize?: number;
}): Promise<TimeEntry[]> {
    return legacyBlocked('getTimeEntries');
}

/**
 * Get clients from database
 */
export async function getClients(filters?: {
    clientId?: string;
    searchTerm?: string;
    organizationId?: string;
    tenantId?: string;
}): Promise<Client[]> {
    return legacyBlocked('getClients');
}

/**
 * Get tenants from database
 */
export async function getTenants(filters?: {
    tenantId?: string;
    status?: string;
    ownerEmail?: string;
    subdomain?: string;
    allowUnscoped?: boolean;
}): Promise<Tenant[]> {
    return legacyBlocked('getTenants');
}

/**
 * Create a new record
 */
export async function createRecord<T extends { id: string }>(
    table: 'users' | 'tasks' | 'clients' | 'time_entries' | 'tenants',
    data: Omit<T, 'id'>,
    options?: {
        organizationId?: string;
        tenantId?: string;
        allowUnscoped?: boolean;
    }
): Promise<T> {
    return legacyBlocked('createRecord');
}

/**
 * Update a record
 */
export async function updateRecord<T extends { id: string }>(
    table: 'users' | 'tasks' | 'clients' | 'time_entries' | 'tenants',
    id: string,
    updates: Partial<T>,
    options?: {
        organizationId?: string;
        tenantId?: string;
        allowUnscoped?: boolean;
    }
): Promise<T> {
    return legacyBlocked('updateRecord');
}

/**
 * Delete a record
 */
export async function deleteRecord(
    table: 'users' | 'tasks' | 'clients' | 'time_entries' | 'tenants',
    id: string,
    options?: {
        organizationId?: string;
        tenantId?: string;
        allowUnscoped?: boolean;
    }
): Promise<void> {
    return legacyBlocked('deleteRecord');
}

// ============================================
// ROLES & PERMISSIONS FUNCTIONS
// ============================================

/**
 * Get all permissions from database
 * @deprecated Legacy RBAC tables (misrad_permissions). Do not use in new code.
 */
export async function getPermissions(): Promise<Array<{ id: PermissionId; label: string; description: string; category: string }>> {
    return legacyBlocked('getPermissions');
}

/**
 * Get all roles from database
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function getRoles(): Promise<RoleDefinition[]> {
    return legacyBlocked('getRoles');
}

/**
 * Get role by name
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function getRoleByName(name: string): Promise<RoleDefinition | null> {
    return legacyBlocked('getRoleByName');
}

/**
 * Create a new role
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function createRole(role: Omit<RoleDefinition, 'id'>): Promise<RoleDefinition> {
    return legacyBlocked('createRole');
}

/**
 * Update a role
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function updateRole(roleId: string, updates: Partial<RoleDefinition>): Promise<RoleDefinition> {
    return legacyBlocked('updateRole');
}

/**
 * Delete a role (only if not system role)
 * @deprecated Legacy RBAC tables (misrad_roles). Do not use in new code.
 */
export async function deleteRole(roleId: string): Promise<void> {
    return legacyBlocked('deleteRole');
}

/**
 * Get user permissions (from their role)
 */
export async function getUserPermissions(userId: string): Promise<PermissionId[]> {
    return legacyBlocked('getUserPermissions');
}

export async function getUserPermissionsForTenant(params: {
    userId: string;
    organizationId?: string;
    tenantId?: string;
}): Promise<PermissionId[]> {
    return legacyBlocked('getUserPermissionsForTenant');
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(
    userId: string,
    roleId: string,
    options?: { organizationId?: string; tenantId?: string }
): Promise<void> {
    return legacyBlocked('assignRoleToUser');
}

/**
 * Set user's manager (hierarchy)
 */
export async function setUserManager(
    userId: string,
    managerId: string | null | undefined,
    options?: { organizationId?: string; tenantId?: string }
): Promise<void> {
    return legacyBlocked('setUserManager');
}

export async function setUserManagerForTenant(
    userId: string,
    managerId: string | null | undefined,
    tenantId: string
): Promise<void> {
    return legacyBlocked('setUserManagerForTenant');
}

/**
 * Get users by manager (get all direct reports)
 */
export async function getUsersByManager(managerId: string): Promise<User[]> {
    return legacyBlocked('getUsersByManager');
}
