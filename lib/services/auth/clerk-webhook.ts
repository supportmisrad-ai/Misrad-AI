import 'server-only';

import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { createErrorResponse } from '@/lib/errorHandler';
import { getUnknownErrorMessage } from '@/lib/shared/unknown';

export async function ensureProfileForClerkUserInOrganizationAction(params: {
  clerkUserId: string;
  organizationId: string;
  role?: string;
  email?: string;
  fullName?: string;
  imageUrl?: string;
}): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    const clerkUserId = String(params.clerkUserId || '').trim();
    const organizationId = String(params.organizationId || '').trim();
    if (!clerkUserId || !organizationId) {
      return createErrorResponse('Missing clerkUserId/organizationId');
    }

    const role = params.role ? String(params.role) : 'owner';

    const existing = await prisma.profile.findFirst({
      where: { clerkUserId, organizationId },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.profile.updateMany({
        where: { id: existing.id, organizationId },
        data: {
          email: params.email ?? undefined,
          fullName: params.fullName ?? undefined,
          avatarUrl: params.imageUrl ?? undefined,
          role,
        },
      });
      return { success: true, profileId: existing.id };
    }

    const created = await prisma.profile.create({
      data: {
        organizationId,
        clerkUserId,
        email: params.email ?? null,
        fullName: params.fullName ?? null,
        avatarUrl: params.imageUrl ?? null,
        role,
      },
      select: { id: true },
    });

    return { success: true, profileId: created.id };
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'Failed to ensure profile');
  }
}

export type ClerkWebhookUserSyncParams = {
  clerkUserId: string;
  email?: string;
  fullName?: string;
  imageUrl?: string;
  preferredOrganizationKey?: string;
  svixId: string;
  svixTimestamp: string;
  bodyHash: string;
  internalCallToken: string;
};

export async function getOrCreateSupabaseUserFromClerkWebhookAction(
  params: ClerkWebhookUserSyncParams
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const webhookSecret =
      process.env.CLERK_WEBHOOK_SECRET ||
      process.env.CLERK_WEB_HOOK_SECRET ||
      '';
    if (!webhookSecret) {
      return createErrorResponse('Webhook secret is not configured');
    }

    const svixId = String(params.svixId || '').trim();
    const svixTimestamp = String(params.svixTimestamp || '').trim();
    const bodyHash = String(params.bodyHash || '').trim();
    const internalCallToken = String(params.internalCallToken || '').trim();

    if (!svixId || !svixTimestamp || !bodyHash || !internalCallToken) {
      return createErrorResponse('Forbidden');
    }

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${svixId}.${svixTimestamp}.${bodyHash}`)
      .digest('hex');

    const ok =
      expected.length === internalCallToken.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(internalCallToken));
    if (!ok) {
      return createErrorResponse('Forbidden');
    }

    const clerkUserId = String(params.clerkUserId || '').trim();
    if (!clerkUserId) {
      return createErrorResponse('Missing clerkUserId');
    }

    const email = params.email ? String(params.email).trim() : undefined;

    const now = new Date();

    // ✅ CRITICAL FIX: Read existing full_name to preserve it
    const existing = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { id: true, full_name: true, email: true },
    });

    // ✅ CRITICAL: Prefer existing name over webhook name
    // This prevents overwriting names set by Admin with names from Google OAuth
    const shouldUpdateName = !existing?.full_name || existing.full_name.trim() === '';
    const finalFullName = shouldUpdateName
      ? (params.fullName ? String(params.fullName) : null)
      : existing.full_name;

    const updateData: {
      email: string | null;
      full_name: string | null;
      avatar_url: string | null;
      updated_at: Date;
    } = {
      email: email ? String(email).trim().toLowerCase() : null,
      full_name: finalFullName,
      avatar_url: params.imageUrl ? String(params.imageUrl) : null,
      updated_at: now,
    };

    if (existing?.id) {
      await prisma.organizationUser.update({
        where: { clerk_user_id: clerkUserId },
        data: updateData,
        select: { id: true },
      });

      return { success: true, userId: String(existing.id) };
    }

    const createData: {
      clerk_user_id: string;
      email: string | null;
      full_name: string | null;
      avatar_url: string | null;
      created_at: Date;
      updated_at: Date;
    } = {
      clerk_user_id: clerkUserId,
      email: updateData.email,
      full_name: updateData.full_name,
      avatar_url: updateData.avatar_url,
      created_at: now,
      updated_at: now,
    };

    const created = await prisma.organizationUser.create({
      data: createData,
      select: { id: true },
    });

    return { success: true, userId: created?.id ? String(created.id) : undefined };
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'Failed to sync user from webhook');
  }
}
