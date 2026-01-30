'use server';

import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getUnknownErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : null;
}

/**
 * Get or create user in Supabase social_users table from Clerk user ID
 * This is a Server Action for the Social module that can bypass RLS if needed
 */
export async function getOrCreateSocialSupabaseUserAction(
  clerkUserId: string,
  email?: string,
  fullName?: string,
  imageUrl?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const resolvedClerkUserId = String(clerkUserId || '').trim();
    if (!resolvedClerkUserId) {
      return createErrorResponse('Missing clerkUserId', 'Missing clerkUserId');
    }

    const existing = await prisma.social_users.findUnique({
      where: { clerk_user_id: resolvedClerkUserId },
      select: { id: true, avatar_url: true },
    });

    if (existing?.id) {
      if (imageUrl && existing.avatar_url !== imageUrl) {
        try {
          await prisma.social_users.update({
            where: { clerk_user_id: resolvedClerkUserId },
            data: { avatar_url: String(imageUrl), updated_at: new Date() },
          });
        } catch {
          // best-effort
        }
      }
      return { success: true, userId: String(existing.id) };
    }

    const now = new Date();
    try {
      const created = await prisma.social_users.create({
        data: {
          clerk_user_id: resolvedClerkUserId,
          email: email ? String(email) : null,
          full_name: fullName ? String(fullName) : null,
          avatar_url: imageUrl ? String(imageUrl) : null,
          created_at: now,
          updated_at: now,
          role: 'team_member',
        },
        select: { id: true },
      });

      return { success: true, userId: created?.id ? String(created.id) : undefined };
    } catch (error: unknown) {
      const obj = asObject(error) ?? {};
      const code = obj.code;
      if (code === 'P2002') {
        const existingAfter = await prisma.social_users.findUnique({
          where: { clerk_user_id: resolvedClerkUserId },
          select: { id: true },
        });
        if (existingAfter?.id) return { success: true, userId: String(existingAfter.id) };
      }
      return createErrorResponse(error, getUnknownErrorMessage(error) || 'Failed to get or create user');
    }
  } catch (error: unknown) {
    const obj = asObject(error) ?? {};
    console.error('[getOrCreateSocialSupabaseUserAction] Unexpected error:', {
      error,
      message: getUnknownErrorMessage(error),
      stack: typeof obj.stack === 'string' ? obj.stack : undefined,
      name: typeof obj.name === 'string' ? obj.name : undefined,
      clerkUserId,
      email,
    });
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'Failed to get or create user');
  }
}

/**
 * Get user role from social_users table (Server Action - bypasses RLS with SERVICE_ROLE_KEY)
 * Role is stored in social_users table: 'super_admin' | 'owner' | 'team_member'
 */
export async function getSocialUserRoleFromSupabaseAction(
  supabaseUserId: string
): Promise<{ success: boolean; role?: string; organizationId?: string; error?: string }> {
  try {
    const id = String(supabaseUserId || '').trim();
    if (!id) return { success: true, role: 'team_member' };

    const user = await prisma.social_users.findFirst({
      where: { id },
      select: { role: true, organization_id: true },
    });

    if (user?.role) {
      return { success: true, role: String(user.role), organizationId: user.organization_id || undefined };
    }

    // Default to 'team_member' if no role found
    return { success: true, role: 'team_member' };
  } catch (error: unknown) {
    console.error('[getSocialUserRoleFromSupabaseAction] Error getting role:', error);
    return createErrorResponse('Failed to get user role', getUnknownErrorMessage(error) || 'Failed to get user role');
  }
}
