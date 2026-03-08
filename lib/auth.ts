import { asObject, getErrorMessage } from '@/lib/shared/unknown';
/**
 * Server-side Authentication & Authorization Utilities
 * 
 * This module provides secure server-side permission checking
 * that cannot be bypassed by client-side manipulation.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { ModuleId, PermissionId, Tenant } from '../types';
import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { ROLE_ADMIN, ROLE_CEO, isTenantAdminRole } from '@/lib/constants/roles';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string');
}

const TENANT_STATUSES: ReadonlySet<Tenant['status']> = new Set(['Active', 'Trial', 'Churned', 'Provisioning']);

function toTenantStatus(value: unknown): Tenant['status'] {
    const s = typeof value === 'string' ? value : String(value ?? '');
    return TENANT_STATUSES.has(s as Tenant['status']) ? (s as Tenant['status']) : 'Trial';
}

const TENANT_REGIONS: ReadonlySet<NonNullable<Tenant['region']>> = new Set(['eu-west', 'us-east', 'il-central']);

function toTenantRegion(value: unknown): Tenant['region'] {
    if (value == null) return undefined;
    const s = typeof value === 'string' ? value : String(value);
    return TENANT_REGIONS.has(s as NonNullable<Tenant['region']>) ? (s as Tenant['region']) : undefined;
}

const MODULE_IDS: readonly ModuleId[] = ['crm', 'finance', 'ai', 'team', 'content', 'assets', 'operations'] as const;
const MODULE_ID_SET: ReadonlySet<ModuleId> = new Set(MODULE_IDS);

function toModuleIds(value: unknown): ModuleId[] {
    if (!Array.isArray(value)) return [];
    return value.filter((m): m is ModuleId => typeof m === 'string' && MODULE_ID_SET.has(m as ModuleId));
}

 function parseEnvCsv(value: string | undefined | null): string[] {
     return String(value || '')
         .split(',')
         .map((v) => v.trim())
         .filter(Boolean);
 }

// Fallback role definitions (used if database is not available)
const FALLBACK_ROLE_PERMISSIONS: Record<string, PermissionId[]> = {
    [ROLE_CEO]: ['view_financials', 'manage_team', 'delete_data', 'view_intelligence', 'view_crm', 'view_assets'],
    [ROLE_ADMIN]: ['manage_team', 'view_intelligence', 'view_crm', 'view_assets'],
    'סמנכ״ל מכירות': ['view_intelligence', 'view_crm', 'view_assets', 'manage_team'],
    'מנהלת שיווק': ['manage_team', 'view_intelligence', 'view_assets', 'view_crm'],
    'איש מכירות': ['view_crm', 'view_intelligence'],
    'מנהל אופרציה': ['manage_team', 'view_intelligence', 'view_assets', 'view_crm'],
    'עובד שיווק': ['view_intelligence', 'view_assets'],
    'אדמיניסטרציה': ['view_assets', 'view_crm', 'manage_team'],
    'הנהלת חשבונות': ['view_financials', 'view_assets', 'view_crm'],
    'מנהל קהילה': ['view_crm', 'view_intelligence'],
    'עובד': ['view_intelligence'],
    'פרילנסר': []
};

async function selectRolePermissionsByName(roleName: string): Promise<PermissionId[] | null> {
    const name = String(roleName || '').trim();
    if (!name) return null;

    try {
        const row = await prisma.misradRole.findUnique({
            where: { name },
            select: { permissions: true },
        });
        if (!row) return null;
        const permsValue = row.permissions;
        if (!Array.isArray(permsValue)) return null;
        const perms = permsValue.filter((p): p is PermissionId => typeof p === 'string') as PermissionId[];
        return perms;
    } catch (e: unknown) {
        if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
            throw new Error(`[SchemaMismatch] misrad_roles lookup failed (${getErrorMessage(e) || 'missing relation'})`);
        }

        if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
            reportSchemaFallback({
                source: 'lib/auth.selectRolePermissionsByName',
                reason: 'misrad_roles lookup schema mismatch (fallback to hardcoded role permissions)',
                error: e,
                extras: { roleName: String(roleName || '') },
            });
        }
        return null;
    }
}

async function selectTenants(filters?: {
    tenantId?: string;
    status?: string;
    ownerEmail?: string;
    subdomain?: string;
}): Promise<Tenant[]> {
    try {
        const where: Prisma.NexusTenantWhereInput = {};
        if (filters?.tenantId) where.id = String(filters.tenantId);
        if (filters?.status) where.status = String(filters.status);
        if (filters?.ownerEmail) where.ownerEmail = String(filters.ownerEmail);
        if (filters?.subdomain) where.subdomain = String(filters.subdomain);

        const data = await withTenantIsolationContext(
            { source: 'lib/auth.selectTenants', reason: 'admin_tenant_lookup', mode: 'global_admin', isSuperAdmin: true },
            async () => prisma.nexusTenant.findMany({ where })
        );
        return (Array.isArray(data) ? data : []).map((row): Tenant => {
            return {
                id: String(row.id ?? ''),
                name: String(row.name ?? ''),
                ownerEmail: String(row.ownerEmail ?? ''),
                subdomain: String(row.subdomain ?? ''),
                plan: String(row.plan ?? ''),
                status: toTenantStatus(row.status),
                joinedAt: row.joinedAt instanceof Date ? row.joinedAt.toISOString() : String(row.joinedAt ?? ''),
                mrr: (row.mrr?.toNumber?.() ?? Number(row.mrr ?? 0)) || 0,
                usersCount: row.usersCount ?? 0,
                logo: row.logo == null ? '' : String(row.logo),
                modules: toModuleIds(row.modules),
                region: toTenantRegion(row.region),
                version: row.version == null ? undefined : String(row.version),
                allowedEmails: Array.isArray(row.allowedEmails) ? row.allowedEmails : [],
                requireApproval: Boolean(row.requireApproval ?? false),
            };
        });
    } catch (e: unknown) {
        if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
            throw new Error(`[SchemaMismatch] nexusTenant.findMany failed (${getErrorMessage(e) || 'missing relation'})`);
        }

        if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
            reportSchemaFallback({
                source: 'lib/auth.selectTenants',
                reason: 'nexusTenant.findMany schema mismatch (fallback to empty list)',
                error: e,
                extras: { filters: filters ?? null },
            });
        }
        return [];
    }
}

/**
 * Get permissions for a role (from database or fallback)
 */
async function getRolePermissions(roleName: string): Promise<PermissionId[]> {
    try {
        // Try to get from database first
        const perms = await selectRolePermissionsByName(roleName);
        if (perms && perms.length > 0) {
            return perms;
        }
    } catch (error) {
        if (getErrorMessage(error).includes('[SchemaMismatch]')) {
            throw error;
        }
        console.warn('[Auth] Could not fetch role from database, using fallback:', {
            message: getErrorMessage(error)
        });
    }
    
    // Fallback to hardcoded permissions
    return FALLBACK_ROLE_PERMISSIONS[roleName] || [];
}

/**
 * Get current authenticated user from Clerk (server-side)
 */
export async function getAuthenticatedUser() {
    try {
        const authResult = await auth();
        const userId = authResult?.userId;
        
        if (!userId) {
            console.warn('[Auth] No user ID found in auth result');
            throw new Error('Unauthorized - No user ID');
        }
        
        const user = await currentUser();
        
        if (!user) {
            console.warn('[Auth] User not found after auth check');
            throw new Error('Unauthorized - User not found');
        }
        
        const rawRole = user.publicMetadata?.role;
        const role = typeof rawRole === 'string' && rawRole.trim() ? rawRole : 'עובד';

        return {
            id: userId,
            email: user.emailAddresses[0]?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            // Get role from metadata (you'll need to set this in Clerk)
            role,
            isSuperAdmin: user.publicMetadata?.isSuperAdmin === true
        };
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error('[Auth] Error in getAuthenticatedUser:', {
            message,
            name: error instanceof Error ? error.name : undefined,
        });
        // Re-throw with clearer message
        if (message.includes('Unauthorized')) {
            throw error instanceof Error ? error : new Error(message);
        }
        throw new Error(`Unauthorized - ${message || 'Authentication failed'}`);
    }
}

/**
 * Check if user has a specific permission (server-side)
 * This is the ONLY source of truth for permissions
 * 
 * IMPORTANT: This function distinguishes between:
 * - Super Admin (system admin): has all permissions system-wide
 * - Tenant Owner/Admin: has permissions within their tenant only
 * - Team Member: has permissions based on their role within tenant
 */
export async function hasPermission(permission: PermissionId): Promise<boolean> {
    try {
        const user = await getAuthenticatedUser();
        
        // Super admins (system admins) have all permissions system-wide
        // They can manage the entire system, all tenants, etc.
        if (user.isSuperAdmin) {
            return true;
        }

        // System management is ONLY for Super Admin
        if (permission === 'manage_system') {
            return false;
        }
        
        // Tenant owners/admins do NOT get blanket permissions.
        // Instead, they are evaluated using role permissions (DB or fallback).
        // If a tenant owner doesn't have an explicit admin role in Clerk metadata,
        // treat them as CEO for permission evaluation.
        const tenantAdmin = await isTenantAdmin();
        const roleForPermissions = tenantAdmin && !isTenantAdminRole(user.role) ? ROLE_CEO : user.role;

        // Permissions are based on the user's effective role.
        const rolePermissions = await getRolePermissions(roleForPermissions);
        return rolePermissions.includes(permission);
    } catch (error) {
        if (getErrorMessage(error).includes('[SchemaMismatch]')) {
            throw error;
        }
        console.error('[Auth] Permission check failed:', {
            message: getErrorMessage(error),
            name: error instanceof Error ? error.name : undefined,
        });
        return false;
    }
}

/**
 * Require a specific permission or throw error
 */
export async function requirePermission(permission: PermissionId): Promise<void> {
    const hasAccess = await hasPermission(permission);
    if (!hasAccess) {
        throw new Error(`Forbidden - Missing permission: ${permission}`);
    }
}

export async function requireSuperAdmin(): Promise<void> {
    const user = await getAuthenticatedUser();
    if (!user.isSuperAdmin) {
        throw new Error('Forbidden - Super Admin required');
    }
}

 function isAuditServiceRole(role: string | null | undefined): boolean {
     const normalized = String(role || '').trim().toLowerCase();
     return normalized === 'audit_service' || normalized === 'audit-service' || normalized === 'audit service';
 }

 export async function hasAuditLogAccess(): Promise<boolean> {
     const user = await getAuthenticatedUser();
     if (user.isSuperAdmin) return true;

     if (!isAuditServiceRole(user.role)) return false;

     const email = String(user.email || '').trim().toLowerCase();
     if (!email) return false;

     const allowed = new Set(
         parseEnvCsv(process.env.AUDIT_SERVICE_ALLOWLIST_EMAILS)
             .map((e) => e.toLowerCase())
     );
     if (allowed.size === 0) return false;
     return allowed.has(email);
 }

 export async function requireAuditLogAccess(): Promise<void> {
     const ok = await hasAuditLogAccess();
     if (!ok) {
         throw new Error('Forbidden - Audit log access required');
     }
 }

/**
 * Check if user is a tenant owner (owns a tenant)
 * This is the ONLY way to verify tenant ownership
 */
export async function isTenantOwner(userEmail?: string, tenantId?: string): Promise<boolean> {
    try {
        const user = await getAuthenticatedUser();
        const email = userEmail || user.email;
        
        if (!email) {
            return false;
        }
        
        // Super admins are not tenant owners (they're system admins)
        if (user.isSuperAdmin) {
            return false;
        }
        
        // Check if user's email matches tenant's ownerEmail (legacy NexusTenant)
        const filters: { ownerEmail?: string; tenantId?: string } = { ownerEmail: email };
        if (tenantId) {
            filters.tenantId = tenantId;
        }
        
        const tenants = await selectTenants(filters);
        if (tenants.length > 0) return true;

        // Also check Organization ownership — new customers have Organization but no NexusTenant
        const orgUser = await prisma.organizationUser.findFirst(
            withPrismaTenantIsolationOverride(
                { where: { clerk_user_id: user.id }, select: { role: true, organization_id: true } },
                { suppressReporting: true, source: 'auth_check_tenant_ownership', reason: 'auth_cross_tenant_clerk_user_lookup' }
            )
        );
        if (orgUser?.role === 'owner' && orgUser.organization_id) {
            return true;
        }

        return false;
    } catch (error) {
        if (getErrorMessage(error).includes('[SchemaMismatch]')) {
            throw error;
        }
        console.error('[Auth] Error checking tenant ownership:', error);
        return false;
    }
}

/**
 * Get tenant that user owns (if any)
 */
export async function getOwnedTenant(): Promise<Tenant | null> {
    try {
        const user = await getAuthenticatedUser();
        
        if (!user.email || user.isSuperAdmin) {
            return null;
        }
        
        const tenants = await selectTenants({ ownerEmail: user.email });
        return tenants.length > 0 ? tenants[0] : null;
    } catch (error) {
        if (getErrorMessage(error).includes('[SchemaMismatch]')) {
            throw error;
        }
        console.error('[Auth] Error getting owned tenant:', error);
        return null;
    }
}

/**
 * Check if user is tenant admin (tenant owner or has admin role within tenant)
 * This is different from Super Admin (system admin)
 */
export async function isTenantAdmin(tenantId?: string): Promise<boolean> {
    try {
        const user = await getAuthenticatedUser();
        
        // Super admins are system admins, not tenant admins
        if (user.isSuperAdmin) {
            return false;
        }
        
        // Check if user is tenant owner
        const isOwner = await isTenantOwner(user.email, tenantId);
        if (isOwner) {
            return true;
        }
        
        // Check if user has admin role within tenant (מנכ״ל, אדמין)
        // Tenant owners automatically have admin permissions
        return isTenantAdminRole(user.role);
    } catch (error) {
        if (getErrorMessage(error).includes('[SchemaMismatch]')) {
            throw error;
        }
        console.error('[Auth] Error checking tenant admin status:', error);
        return false;
    }
}

/**
 * Check if user can access specific resource
 */
export async function canAccessResource(
    resourceType: 'user' | 'client' | 'task' | 'asset',
    resourceId: string,
    action: 'read' | 'write' | 'delete',
    scope: { organizationId: string }
): Promise<boolean> {
    const user = await getAuthenticatedUser();
    
    // Super admins can access everything (system-wide)
    if (user.isSuperAdmin) {
        return true;
    }

    const organizationId = String(scope?.organizationId || '').trim();
    if (!organizationId) {
        throw new Error('Forbidden - Missing organization scope');
    }
    
    // Implement resource-specific checks here
    // For example: users can only see their own tasks unless they're managers
    switch (resourceType) {
        case 'task':
            // Logic: users can read their own tasks, managers can read all
            if (action === 'read') {
                const hasCrmAccess = await hasPermission('view_crm');
                if (!hasCrmAccess) return false;
                const row = await prisma.nexusTask.findFirst({
                    where: { id: String(resourceId), organizationId: String(organizationId) },
                    select: { id: true },
                });
                return Boolean(row?.id);
            }
            if (action === 'write') {
                const hasCrmAccess = await hasPermission('view_crm');
                if (!hasCrmAccess) return false;
                const row = await prisma.nexusTask.findFirst({
                    where: { id: String(resourceId), organizationId: String(organizationId) },
                    select: { id: true },
                });
                return Boolean(row?.id);
            }
            break;
        case 'user':
            // Logic: users can read their own profile, managers can read all
            if (action === 'read') {
                if (resourceId === user.id) return true;
                const canManage = await hasPermission('manage_team');
                if (!canManage) return false;

                // Support both IDs: clerk user id (profiles) and nexus user id (uuid)
                const byClerk = await prisma.profile.findFirst({
                    where: { organizationId: String(organizationId), clerkUserId: String(resourceId) },
                    select: { id: true },
                });
                if (byClerk?.id) return true;

                const byNexusId = await prisma.nexusUser.findFirst({
                    where: { id: String(resourceId), organizationId: String(organizationId) },
                    select: { id: true },
                });
                return Boolean(byNexusId?.id);
            }
            break;
        case 'client':
            {
                const canView = await hasPermission('view_crm');
                if (!canView) return false;
                const row = await prisma.nexusClient.findFirst({
                    where: { id: String(resourceId), organizationId: String(organizationId) },
                    select: { id: true },
                });
                return Boolean(row?.id);
            }
        case 'asset':
            {
                const canView = await hasPermission('view_assets');
                if (!canView) return false;

                // nexus_assets is not modeled in Prisma in this repo; check the modeled assets table.
                const assetRow = await prisma.misradClientAsset.findFirst({
                    where: { id: String(resourceId), organization_id: String(organizationId) },
                    select: { id: true },
                });
                return Boolean(assetRow?.id);
            }
    }
    
    return false;
}

/**
 * Filter sensitive data based on user permissions
 */
export async function filterSensitiveData<T extends object>(
    data: T,
    dataType: 'user' | 'financial' | 'task'
): Promise<Partial<T>> {
    const user = await getAuthenticatedUser();
    
    // Super admins see everything
    if (user.isSuperAdmin) {
        return data;
    }
    
    switch (dataType) {
        case 'user':
            // Remove sensitive fields for non-managers
            const canViewFinancials = await hasPermission('view_financials');
            if (!canViewFinancials) {
                const safeData: Partial<T> = { ...data };
                Reflect.deleteProperty(safeData, 'hourlyRate');
                Reflect.deleteProperty(safeData, 'monthlySalary');
                Reflect.deleteProperty(safeData, 'commissionPct');
                Reflect.deleteProperty(safeData, 'accumulatedBonus');
                return safeData;
            }
            break;
        case 'financial':
            const hasFinancialAccess = await hasPermission('view_financials');
            if (!hasFinancialAccess) {
                return {}; // Return empty object
            }
            break;
    }
    
    return data;
}

