'use server';

import { createErrorResponse } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';

import { getUnknownErrorMessage } from '@/lib/shared/unknown';
import { getOrCreateOrganizationUserByClerkUserId } from '@/lib/services/social-users';

/**
 * Get or create user in Supabase social_users table from Clerk user ID
 * This is a Server Action for the Social module that can bypass RLS if needed
 */
export async function getOrCreateOrganizationUserAction(
  clerkUserId: string,
  email?: string,
  fullName?: string,
  imageUrl?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  return await getOrCreateOrganizationUserByClerkUserId(clerkUserId, email, fullName, imageUrl);
}

export async function getOrCreateSocialSupabaseUserAction(
  clerkUserId: string,
  email?: string,
  fullName?: string,
  imageUrl?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  return await getOrCreateOrganizationUserAction(clerkUserId, email, fullName, imageUrl);
}

/**
 * Get user role from social_users table (Server Action - bypasses RLS with SERVICE_ROLE_KEY)
 * Role is stored in social_users table: 'super_admin' | 'owner' | 'team_member'
 */
export async function getOrganizationUserRoleFromSupabaseAction(
  supabaseUserId: string
): Promise<{ success: boolean; role?: string; organizationId?: string; error?: string }> {
  try {
    const id = String(supabaseUserId || '').trim();
    if (!id) return { success: true, role: 'team_member' };

    const user = await prisma.organizationUser.findFirst({
      where: { id },
      select: { role: true, organization_id: true },
    });

    if (user?.role) {
      return { success: true, role: String(user.role), organizationId: user.organization_id || undefined };
    }

    // Default to 'team_member' if no role found
    return { success: true, role: 'team_member' };
  } catch (error: unknown) {
    console.error('[getOrganizationUserRoleFromSupabaseAction] Error getting role:', error);
    return createErrorResponse('Failed to get user role', getUnknownErrorMessage(error) || 'Failed to get user role');
  }
}

export async function getSocialUserRoleFromSupabaseAction(
  supabaseUserId: string
): Promise<{ success: boolean; role?: string; organizationId?: string; error?: string }> {
  return await getOrganizationUserRoleFromSupabaseAction(supabaseUserId);
}
