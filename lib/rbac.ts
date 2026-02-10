/**
 * Role-Based Access Control (RBAC)
 * Manages user permissions and access control
 */

import { UserRole } from '@/types/social';

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

 const roleCache = new Map<string, { role: UserRole; timestamp: number }>();
 const ROLE_CACHE_DURATION_MS = 5 * 60 * 1000;

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    { resource: '*', action: 'admin' }, // Full access to everything - system management
  ],
  owner: [
    { resource: 'organization', action: 'admin' }, // Manage own organization
    { resource: 'clients', action: 'write' }, // Manage clients in own organization
    { resource: 'team_members', action: 'write' }, // Add/remove team members
    { resource: 'posts', action: 'write' },
    { resource: 'campaigns', action: 'write' },
    { resource: 'tasks', action: 'write' },
    { resource: 'invoices', action: 'write' },
    { resource: 'payments', action: 'write' },
    { resource: 'settings', action: 'write' },
  ],
  team_member: [
    { resource: 'clients', action: 'read' }, // Read clients in own organization
    { resource: 'posts', action: 'write' }, // Create/edit posts
    { resource: 'campaigns', action: 'read' }, // Read campaigns
    { resource: 'tasks', action: 'write' }, // Manage assigned tasks
    { resource: 'invoices', action: 'read' }, // Read invoices
    { resource: 'payments', action: 'read' }, // Read payments
  ],
};

/**
 * Check if user has permission
 */
export function hasPermission(userRole: UserRole, resource: string, action: Permission['action']): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  
  // Super admin has all permissions
  if (userRole === 'super_admin') {
    return true;
  }

  // Check for wildcard or specific resource
  return permissions.some(p => 
    (p.resource === '*' || p.resource === resource) && 
    (p.action === 'admin' || p.action === action)
  );
}

/**
 * Check if user can access admin panel (system management)
 * System-wide admin: super_admin
 * Tenant admin shell: owner (organization-level admin)
 */
export function canAccessAdminPanel(userRole: UserRole): boolean {
  return userRole === 'super_admin';
}

/**
 * Check if user can manage organization (add team members, manage clients)
 * Both super_admin and owner can do this
 */
export function canManageOrganization(userRole: UserRole): boolean {
  return userRole === 'super_admin' || userRole === 'owner';
}

/**
 * Check if user can manage team members
 * Only super_admin and owner can add/remove team members
 */
export function canManageTeamMembers(userRole: UserRole): boolean {
  return userRole === 'super_admin' || userRole === 'owner';
}

/**
 * Get user role from Clerk metadata or database
 * Uses localStorage cache to improve performance
 */
export async function getUserRole(
  clerkUserId: string,
  email?: string,
  fullName?: string,
  imageUrl?: string
): Promise<UserRole> {
  const cacheKey = String(clerkUserId || '').trim();
  if (cacheKey) {
    const cached = roleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ROLE_CACHE_DURATION_MS) {
      return cached.role;
    }
  }

  try {
    // Check if we're in a social context (window pathname contains /social)
    const isSocialContext = typeof window !== 'undefined' && 
      (window.location.pathname.includes('/social') || 
       false);
    
    // Get or create user in Supabase (Server Action - bypasses RLS)
    if (isSocialContext) {
      const { getOrCreateOrganizationUserAction, getOrganizationUserRoleFromSupabaseAction } = await import('@/app/actions/social-users');
      const userResult = await getOrCreateOrganizationUserAction(clerkUserId, email, fullName, imageUrl);
      
      if (!userResult.success || !userResult.userId) {
        console.error('[getUserRole] Failed to get/create user:', {
          success: userResult.success,
          userId: userResult.userId,
          error: userResult.error || 'Unknown error (error field missing)',
          fullResult: userResult,
          clerkUserId,
          email,
          fullName,
        });
        return 'team_member';
      }
      
      // Get role from organization_users table
      const roleResult = await getOrganizationUserRoleFromSupabaseAction(userResult.userId);
      
      if (!roleResult.success || !roleResult.role) {
        console.error('[getUserRole] Failed to get role:', {
          success: roleResult.success,
          role: roleResult.role,
          error: roleResult.error || 'Unknown error',
          fullResult: roleResult,
        });
        return 'team_member';
      }
      
      const role = roleResult.role as UserRole;
      if (cacheKey) {
        roleCache.set(cacheKey, { role, timestamp: Date.now() });
      }
      
      return role;
    } else {
      // Use main system functions
      const { getOrCreateSupabaseUserAction, getUserRoleFromSupabaseAction } = await import('@/app/actions/users');
      const userResult = await getOrCreateSupabaseUserAction(clerkUserId, email, fullName, imageUrl);
      
      if (!userResult.success || !userResult.userId) {
        console.error('[getUserRole] Failed to get/create user via Server Action:', {
          success: userResult.success,
          userId: userResult.userId,
          error: userResult.error || 'Unknown error (error field missing)',
          fullResult: userResult,
          clerkUserId,
          email,
          fullName,
        });
        return 'team_member';
      }
      
      // Get role from users table
      const roleResult = await getUserRoleFromSupabaseAction(userResult.userId);
      
      if (!roleResult.success || !roleResult.role) {
        console.error('[getUserRole] Failed to get role via Server Action:', {
          success: roleResult.success,
          role: roleResult.role,
          error: roleResult.error || 'Unknown error',
          fullResult: roleResult,
        });
        return 'team_member';
      }
      
      const role = roleResult.role as UserRole;
      if (cacheKey) {
        roleCache.set(cacheKey, { role, timestamp: Date.now() });
      }
      
      return role;
    }
  } catch (error: unknown) {
    console.error('[getUserRole] Error getting user role:', error);
    const message = error instanceof Error ? error.message : '';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('[getUserRole] Error details:', {
      message,
      stack,
    });
    // Default to least privileged role instead of trying client-side (which will fail)
    return 'team_member';
  }
}

// Note: getRoleFromSupabase was removed - now using getUserRoleFromSupabaseAction Server Action instead
// This ensures the role lookup runs on the server with SERVICE_ROLE_KEY to bypass RLS
