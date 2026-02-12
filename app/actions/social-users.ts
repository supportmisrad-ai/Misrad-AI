'use server';

import { createErrorResponse } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';

import { getUnknownErrorMessage } from '@/lib/shared/unknown';
import { getOrCreateOrganizationUserByClerkUserId } from '@/lib/services/social-users';
import { getAuthenticatedUser } from '@/lib/auth';

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
  try {
    const authUser = await getAuthenticatedUser();
    const resolvedAuthUserId = String(authUser?.id || '').trim();
    if (!resolvedAuthUserId) {
      return createErrorResponse('Unauthorized', 'נדרשת התחברות');
    }

    const requested = String(clerkUserId || '').trim();
    if (requested && requested !== resolvedAuthUserId && authUser.isSuperAdmin !== true) {
      return createErrorResponse('Forbidden', 'אין הרשאה');
    }

    return await getOrCreateOrganizationUserByClerkUserId(resolvedAuthUserId, email, fullName, imageUrl);
  } catch (error: unknown) {
    return createErrorResponse('Unauthorized', getUnknownErrorMessage(error) || 'נדרשת התחברות');
  }
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
 * Get user role from organization_users table (Server Action - bypasses RLS with SERVICE_ROLE_KEY)
 * Role is stored in social_users table: 'super_admin' | 'owner' | 'team_member'
 */
export async function getOrganizationUserRoleFromSupabaseAction(
  supabaseUserId: string
): Promise<{ success: boolean; role?: string; organizationId?: string; error?: string }> {
  try {
    const authUser = await getAuthenticatedUser();
    const resolvedAuthUserId = String(authUser?.id || '').trim();
    if (!resolvedAuthUserId) {
      return createErrorResponse('Unauthorized', 'נדרשת התחברות');
    }

    const id = String(supabaseUserId || '').trim();
    if (!id) return { success: true, role: 'team_member' };

    if (authUser.isSuperAdmin !== true) {
      const self = await prisma.organizationUser.findUnique({
        where: { clerk_user_id: resolvedAuthUserId },
        select: { id: true, role: true, organization_id: true },
      });

      if (!self?.id) {
        return createErrorResponse('Unauthorized', 'אין הרשאה');
      }

      if (String(self.id) !== id) {
        return createErrorResponse('Forbidden', 'אין הרשאה');
      }

      return {
        success: true,
        role: self.role ? String(self.role) : 'team_member',
        organizationId: self.organization_id || undefined,
      };
    }

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
