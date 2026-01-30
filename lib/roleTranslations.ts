/**
 * Role translations and display helpers
 * Provides Hebrew translations and display names for user roles
 */

import { UserRole, TeamMemberRole } from '@/types/social';

/**
 * Hebrew translations for user roles
 */
export const ROLE_TRANSLATIONS: Record<UserRole, string> = {
  super_admin: 'אדמין מערכת',
  owner: 'בעלים',
  team_member: 'חבר צוות',
};

/**
 * Hebrew translations for team member roles (within organization)
 */
export const TEAM_ROLE_TRANSLATIONS: Record<TeamMemberRole, string> = {
  account_manager: 'מנהל לקוחות',
  content_creator: 'יוצר תוכן',
  designer: 'מעצב',
};

/**
 * Get Hebrew display name for a user role
 */
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_TRANSLATIONS[role] || role;
}

/**
 * Get Hebrew display name for a team member role
 */
export function getTeamRoleDisplayName(role: TeamMemberRole): string {
  return TEAM_ROLE_TRANSLATIONS[role] || role;
}

/**
 * Get role badge color class (for UI styling)
 */
export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'owner':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'team_member':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

/**
 * Get role icon (emoji or icon name)
 */
export function getRoleIcon(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '👑';
    case 'owner':
      return '👔';
    case 'team_member':
      return '👤';
    default:
      return '👤';
  }
}

/**
 * Check if role has admin privileges
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Check if role can manage organization
 */
export function canManageOrg(role: UserRole): boolean {
  return role === 'super_admin' || role === 'owner';
}

