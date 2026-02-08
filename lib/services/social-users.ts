import { createErrorResponse } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';
import { asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';

export async function getOrCreateOrganizationUserByClerkUserId(
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

    const existing = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: resolvedClerkUserId },
      select: { id: true, avatar_url: true },
    });

    if (existing?.id) {
      if (imageUrl && existing.avatar_url !== imageUrl) {
        try {
          await prisma.organizationUser.update({
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
      const created = await prisma.organizationUser.create({
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
        const existingAfter = await prisma.organizationUser.findUnique({
          where: { clerk_user_id: resolvedClerkUserId },
          select: { id: true },
        });
        if (existingAfter?.id) return { success: true, userId: String(existingAfter.id) };
      }
      return createErrorResponse(error, getUnknownErrorMessage(error) || 'Failed to get or create user');
    }
  } catch (error: unknown) {
    const obj = asObject(error) ?? {};
    console.error('[getOrCreateOrganizationUserByClerkUserId] Unexpected error:', {
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
