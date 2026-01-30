/**
 * Server-side Authentication & Authorization Utilities
 * 
 * This module provides secure server-side permission checking
 * that cannot be bypassed by client-side manipulation.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { PermissionId, Tenant } from '../types';
import { createClient } from '@/lib/supabase';
import { ROLE_ADMIN, ROLE_CEO, isTenantAdminRole } from '@/lib/constants/roles';

 function parseEnvCsv(value: string | undefined | null): string[] {
     return String(value || '')
         .split(',')
         .map((v) => v.trim())
         .filter(Boolean);
 }

// Fallback role definitions (used if database is not available)
const FALLBACK_ROLE_PERMISSIONS: Record<string, PermissionId[]> = {
    [ROLE_CEO]: ['view_financials', 'manage_team', 'manage_system', 'delete_data', 'view_intelligence', 'view_crm', 'view_assets'],
    [ROLE_ADMIN]: ['view_financials', 'manage_team', 'manage_system', 'delete_data', 'view_intelligence', 'view_crm', 'view_assets'],
    'סמנכ״ל מכירות': ['view_financials', 'view_intelligence', 'view_crm', 'view_assets', 'manage_team'],
    'מנהלת שיווק': ['manage_team', 'view_intelligence', 'view_assets', 'view_crm'],
    'איש מכירות': ['view_crm', 'view_intelligence'],
    'מנהל אופרציה': ['manage_team', 'view_intelligence', 'view_assets', 'view_crm'],
    'עובד שיווק': ['view_intelligence', 'view_assets'],
    'אדמיניסטרציה': ['view_assets', 'view_crm', 'manage_team', 'view_financials'],
    'הנהלת חשבונות': ['view_financials', 'view_assets', 'view_crm'],
    'מנהל קהילה': ['view_crm', 'view_intelligence'],
    'עובד': ['view_intelligence'],
    'פרילנסר': []
};

async function selectRolePermissionsByName(roleName: string): Promise<PermissionId[] | null> {
    const name = String(roleName || '').trim();
    if (!name) return null;

    const supabase = createClient();
    const { data, error } = await supabase
        .from('misrad_roles')
        .select('permissions')
        .eq('name', name)
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    const perms = (data as any)?.permissions;
    return Array.isArray(perms) ? (perms as PermissionId[]) : null;
}

async function selectTenants(filters?: {
    tenantId?: string;
    status?: string;
    ownerEmail?: string;
    subdomain?: string;
}): Promise<Tenant[]> {
    const supabase = createClient();

    let query = supabase.from('nexus_tenants').select('*');
    if (filters?.tenantId) query = query.eq('id', filters.tenantId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.ownerEmail) query = query.eq('owner_email', filters.ownerEmail);
    if (filters?.subdomain) query = query.eq('subdomain', filters.subdomain);

    const { data, error } = await query;
    if (error) return [];

    return (Array.isArray(data) ? data : []).map((row: any) => ({
        id: row.id,
        name: row.name,
        ownerEmail: row.owner_email,
        subdomain: row.subdomain,
        plan: row.plan,
        status: row.status,
        joinedAt: row.joined_at,
        mrr: row.mrr || 0,
        usersCount: row.users_count || 0,
        logo: row.logo,
        modules: row.modules || [],
        region: row.region,
        version: row.version,
        allowedEmails: row.allowed_emails || [],
        requireApproval: row.require_approval || false,
    })) as Tenant[];
}

/**
 * Get permissions for a role (from database or fallback)
 */
async function getRolePermissions(roleName: string): Promise<PermissionId[]> {
    try {
        // Try to get from database first
        const perms = await selectRolePermissionsByName(roleName);
        if (perms && perms.length >= 0) {
            return perms;
        }
    } catch (error) {
        console.warn('[Auth] Could not fetch role from database, using fallback:', {
            message: (error as any)?.message
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
        
        return {
            id: userId,
            email: user.emailAddresses[0]?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            // Get role from metadata (you'll need to set this in Clerk)
            role: user.publicMetadata?.role as string || 'עובד',
            isSuperAdmin: user.publicMetadata?.isSuperAdmin === true
        };
    } catch (error: any) {
        console.error('[Auth] Error in getAuthenticatedUser:', {
            message: error?.message,
            name: error?.name
        });
        // Re-throw with clearer message
        if (error.message?.includes('Unauthorized')) {
            throw error;
        }
        throw new Error(`Unauthorized - ${error.message || 'Authentication failed'}`);
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
        
        // Tenant owners/admins have admin permissions within their tenant
        // They can manage their organization (add team members, manage clients, etc.)
        // BUT they cannot manage the system itself (that's only for Super Admin)
        const tenantAdmin = await isTenantAdmin();
        
        // Tenant admins have most permissions, except system management
        if (tenantAdmin) {
            // Tenant admins can do everything EXCEPT system management
            // System management (manage_system) is ONLY for Super Admin
            if (permission === 'manage_system') {
                return false; // Only Super Admin can manage system
            }
            // All other permissions are allowed for tenant admins
            return true;
        }
        
        // Regular team members: permissions based on their role.
        // Tenant isolation: we do not perform cross-tenant DB lookups here.
        const rolePermissions = await getRolePermissions(user.role);
        return rolePermissions.includes(permission);
    } catch (error) {
        console.error('[Auth] Permission check failed:', {
            message: (error as any)?.message,
            name: (error as any)?.name
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
        
        // Check if user's email matches tenant's ownerEmail
        const filters: { ownerEmail?: string; tenantId?: string } = { ownerEmail: email };
        if (tenantId) {
            filters.tenantId = tenantId;
        }
        
        const tenants = await selectTenants(filters);
        return tenants.length > 0;
    } catch (error) {
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

    const supabase = createClient();

    const ensureExistsInOrg = async (table: string): Promise<boolean> => {
        const res = await supabase
            .from(table)
            .select('id')
            .eq('id', resourceId)
            .eq('organization_id', organizationId)
            .limit(1)
            .maybeSingle();

        const error = (res as any)?.error;
        if ((error as any)?.code === '42703') {
            return false;
        }
        if (error) {
            return false;
        }
        return Boolean((res as any)?.data?.id);
    };
    
    // Tenant owners have admin permissions within their tenant
    const tenantAdmin = await isTenantAdmin();

    // Implement resource-specific checks here
    // For example: users can only see their own tasks unless they're managers
    switch (resourceType) {
        case 'task':
            // Logic: users can read their own tasks, managers can read all
            if (action === 'read') {
                const hasCrmAccess = await hasPermission('view_crm');
                if (!hasCrmAccess) return false;
                if (tenantAdmin) {
                    return await ensureExistsInOrg('nexus_tasks');
                }
                return await ensureExistsInOrg('nexus_tasks');
            }
            if (action === 'write') {
                const hasCrmAccess = await hasPermission('view_crm');
                if (!hasCrmAccess) return false;
                if (tenantAdmin) {
                    return await ensureExistsInOrg('nexus_tasks');
                }
                return await ensureExistsInOrg('nexus_tasks');
            }
            break;
        case 'user':
            // Logic: users can read their own profile, managers can read all
            if (action === 'read') {
                if (resourceId === user.id) return true;
                const canManage = await hasPermission('manage_team');
                if (!canManage) return false;
                if (tenantAdmin) {
                    return await ensureExistsInOrg('nexus_users');
                }
                return await ensureExistsInOrg('nexus_users');
            }
            break;
        case 'client':
            {
                const canView = await hasPermission('view_crm');
                if (!canView) return false;
                if (tenantAdmin) {
                    return await ensureExistsInOrg('nexus_clients');
                }
                return await ensureExistsInOrg('nexus_clients');
            }
        case 'asset':
            {
                const canView = await hasPermission('view_assets');
                if (!canView) return false;
                const candidateTables = ['nexus_assets', 'misrad_client_assets'];
                for (const table of candidateTables) {
                    const ok = await ensureExistsInOrg(table);
                    if (ok) return true;
                }
                return false;
            }
    }
    
    return false;
}

/**
 * Filter sensitive data based on user permissions
 */
export async function filterSensitiveData<T extends Record<string, any>>(
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
                const { hourlyRate, monthlySalary, commissionPct, accumulatedBonus, ...safeData } = data;
                return safeData as Partial<T>;
            }
            break;
        case 'financial':
            const hasFinancialAccess = await hasPermission('view_financials');
            if (!hasFinancialAccess) {
                return {} as Partial<T>; // Return empty object
            }
            break;
    }
    
    return data;
}

