'use server';

import { currentUser } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { BILLING_PACKAGES, type PackageType } from '@/lib/billing/pricing';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getBaseUrl } from '@/lib/utils';
import { sendMisradWelcomeEmail } from '@/lib/email';

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

function getUnknownErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : null;
}

function serializeUnknownError(error: unknown) {
  if (!error) return error;

  if (error instanceof Error) {
    const errorObj = asObject(error);
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: errorObj?.cause,
    };
  }

  if (typeof error === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(error)) {
      try {
        out[key] = (error as Record<string, unknown>)[key];
      } catch (e: unknown) {
        out[key] = `[unreadable: ${getUnknownErrorMessage(e) ?? 'unknown'}]`;
      }
    }
    return out;
  }

  return { value: error };
}
 
function normalizeSlug(input: string): string {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function isUuidLike(value: string | null | undefined): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
}

async function upsertSocialUserForClerkUser(params: {
  clerkUserId: string;
  organizationId: string;
  email?: string;
  fullName?: string;
  imageUrl?: string;
  role?: string | null;
}): Promise<{ id: string; organization_id: string | null; role: string | null } | null> {
  const clerkUserId = String(params.clerkUserId || '').trim();
  const organizationId = String(params.organizationId || '').trim();
  if (!clerkUserId || !organizationId) return null;

  const now = new Date();
  const emailLower = params.email ? String(params.email).trim().toLowerCase() : null;
  const fullName = params.fullName ? String(params.fullName) : null;
  const avatarUrl = params.imageUrl ? String(params.imageUrl) : null;
  const role = params.role ? String(params.role) : null;

  const existing = await prisma.social_users.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: { id: true, organization_id: true, role: true },
  });

  if (existing?.id) {
    await prisma.social_users.update({
      where: { clerk_user_id: clerkUserId },
      data: {
        email: emailLower,
        full_name: fullName,
        avatar_url: avatarUrl,
        organization_id: organizationId,
        ...(role ? { role } : {}),
        updated_at: now,
      },
    });
    return {
      id: String(existing.id),
      organization_id: organizationId,
      role: role ?? (existing.role ? String(existing.role) : null),
    };
  }

  const created = await prisma.social_users.create({
    data: {
      clerk_user_id: clerkUserId,
      email: emailLower,
      full_name: fullName,
      avatar_url: avatarUrl,
      organization_id: organizationId,
      role: role ?? 'owner',
      created_at: now,
      updated_at: now,
    },
    select: { id: true, organization_id: true, role: true },
  });

  return created?.id
    ? {
        id: String(created.id),
        organization_id: created.organization_id ? String(created.organization_id) : null,
        role: created.role ? String(created.role) : null,
      }
    : null;
}

async function upsertProfileForClerkUser(params: {
  clerkUserId: string;
  email?: string;
  fullName?: string;
  imageUrl?: string;
  preferredOrganizationKey?: string;
  pendingPlan?: PackageType;
  sendWelcomeEmail?: boolean;
}): Promise<{ profileId: string; organizationId: string; organizationSlug?: string | null; role?: string | null }> {
  const clerkUserId = String(params.clerkUserId || '').trim();
  if (!clerkUserId) throw new Error('Missing clerkUserId');

  const preferredKeyRaw = params.preferredOrganizationKey ? String(params.preferredOrganizationKey).trim() : '';
  const isOrgInviteMode = preferredKeyRaw.toLowerCase().startsWith('invite:');
  const isEmployeeInviteMode = preferredKeyRaw.toLowerCase().startsWith('employee-invite:');

  // If profile already exists - best effort update
  const existing = await prisma.profile.findFirst({
    where: { clerkUserId },
    select: { id: true, organizationId: true, role: true },
  });

  if (existing?.id) {
    // Best-effort update user fields (no changes to org here)
    await prisma.profile.updateMany({
      where: { id: existing.id, organizationId: existing.organizationId },
      data: {
        email: params.email ?? undefined,
        fullName: params.fullName ?? undefined,
        avatarUrl: params.imageUrl ?? undefined,
      },
    });

    const existingOrgKey = String(existing.organizationId || '').trim();
    let organizationIdOut = existingOrgKey;
    let org: { id: string; slug: string | null } | null = null;

    if (existingOrgKey) {
      if (isUuidLike(existingOrgKey)) {
        org = await prisma.social_organizations.findFirst({
          where: { id: existingOrgKey },
          select: { id: true, slug: true },
        });
      } else {
        org = await prisma.social_organizations.findFirst({
          where: { slug: existingOrgKey },
          select: { id: true, slug: true },
        });

        if (org?.id) {
          organizationIdOut = String(org.id);
          await prisma.profile.updateMany({
            where: { id: existing.id, organizationId: existing.organizationId },
            data: { organizationId: String(org.id) },
          });
        }
      }
    }

    if (organizationIdOut) {
      await upsertSocialUserForClerkUser({
        clerkUserId,
        organizationId: organizationIdOut,
        email: params.email,
        fullName: params.fullName,
        imageUrl: params.imageUrl,
        role: existing.role ?? null,
      });
    }

    return {
      profileId: existing.id,
      organizationId: organizationIdOut,
      organizationSlug: org?.slug ?? null,
      role: existing.role ?? null,
    };
  }

  // Special mode: when preferred key is invite:<token>, the webhook will create the organization.
  // We must NOT auto-create org here.
  if (isOrgInviteMode) {
    // Option A: webhook is the manager. This function must not provision anything in invite mode.
    // The caller should wait for webhook provisioning and then retry with an org key.
    throw new Error('Invite mode: wait for webhook provisioning (no-op)');
  }

  // If we received an existing organization key (uuid or slug), attach profile to it.
  // This is used by webhooks after the org is provisioned.
  if (preferredKeyRaw && !isEmployeeInviteMode) {
    const where = isUuidLike(preferredKeyRaw)
      ? {
          OR: [{ id: preferredKeyRaw }, { slug: preferredKeyRaw }],
        }
      : {
          slug: preferredKeyRaw,
        };

    const org = await prisma.social_organizations.findFirst({
      where,
      select: { id: true, slug: true },
    });

    if (org?.id) {
      const created = await prisma.profile.create({
        data: {
          organizationId: org.id,
          clerkUserId,
          email: params.email ?? null,
          fullName: params.fullName ?? null,
          avatarUrl: params.imageUrl ?? null,
          role: 'owner',
        },
        select: { id: true, organizationId: true, role: true },
      });

      await upsertSocialUserForClerkUser({
        clerkUserId,
        organizationId: created.organizationId,
        email: params.email,
        fullName: params.fullName,
        imageUrl: params.imageUrl,
        role: created.role ?? null,
      });

      return {
        profileId: created.id,
        organizationId: created.organizationId,
        organizationSlug: org.slug ?? null,
        role: created.role ?? null,
      };
    }
  }

  // If employee invite mode - attach to the invited org (no auto-org)
  if (isEmployeeInviteMode) {
    const token = preferredKeyRaw.slice('employee-invite:'.length).trim();
    const emailLower = params.email ? String(params.email).trim().toLowerCase() : '';
    if (!token || !emailLower) {
      throw new Error('Employee invite token/email missing');
    }

    const inviteRow = await prisma.nexus_employee_invitation_links.findUnique({
      where: { token },
      select: { organizationId: true, employee_email: true, is_active: true, is_used: true, expires_at: true },
    });

    const orgId = inviteRow?.organizationId ? String(inviteRow.organizationId).trim() : '';
    const inviteEmail = inviteRow?.employee_email ? String(inviteRow.employee_email).trim().toLowerCase() : '';
    const isActive = Boolean(inviteRow?.is_active);
    const isUsed = Boolean(inviteRow?.is_used);
    const expiresAtRaw = inviteRow?.expires_at ? new Date(String(inviteRow.expires_at)) : null;
    const notExpired = !expiresAtRaw || Number.isNaN(expiresAtRaw.getTime()) ? true : expiresAtRaw.getTime() >= Date.now();

    if (!orgId || !isActive || isUsed || !inviteEmail || inviteEmail !== emailLower || !notExpired) {
      throw new Error('Employee invite is invalid/expired');
    }

    const created = await prisma.profile.create({
      data: {
        organizationId: orgId,
        clerkUserId,
        email: params.email ?? null,
        fullName: params.fullName ?? null,
        avatarUrl: params.imageUrl ?? null,
        role: 'team_member',
      },
      select: { id: true, organizationId: true, role: true },
    });

    await upsertSocialUserForClerkUser({
      clerkUserId,
      organizationId: created.organizationId,
      email: params.email,
      fullName: params.fullName,
      imageUrl: params.imageUrl,
      role: created.role ?? null,
    });

    const createdOrgKey = String(created.organizationId || '').trim();
    const org = await prisma.social_organizations.findFirst({
      where: isUuidLike(createdOrgKey) ? { id: createdOrgKey } : { slug: createdOrgKey },
      select: { id: true, slug: true },
    });

    return {
      profileId: created.id,
      organizationId: created.organizationId,
      organizationSlug: org?.slug ?? null,
      role: created.role ?? null,
    };
  }

  // Default: create an org + owner profile (with predetermined UUID for owner_id)
  const ownerProfileId = crypto.randomUUID();
  const ownerIdPlaceholder = crypto.randomUUID();
  const orgName = params.fullName || params.email || 'Organization';
  const slugBase = normalizeSlug(orgName);

  const pendingPlanRaw = params.pendingPlan ? String(params.pendingPlan).trim() : '';
  const pendingPlan = pendingPlanRaw && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, pendingPlanRaw) ? (pendingPlanRaw as PackageType) : null;
  const planModules: OSModuleKey[] | null = pendingPlan
    ? pendingPlan === 'solo'
      ? (['system'] as OSModuleKey[])
      : [...(BILLING_PACKAGES[pendingPlan].modules || [])]
    : null;
  const hasModule = (k: OSModuleKey): boolean => Boolean(planModules && planModules.includes(k));

  const createdOrg = await prisma.social_organizations.create({
    data: {
      name: orgName,
      slug: slugBase || null,
      owner_id: ownerIdPlaceholder,
      has_nexus: pendingPlan ? hasModule('nexus') : true,
      has_system: pendingPlan ? hasModule('system') : false,
      has_social: pendingPlan ? hasModule('social') : false,
      has_finance: pendingPlan ? hasModule('finance') : false,
      has_client: pendingPlan ? hasModule('client') : false,
      has_operations: pendingPlan ? hasModule('operations') : false,
      subscription_status: 'trial',
      subscription_plan: pendingPlan ? String(pendingPlan) : null,
      trial_start_date: new Date(),
      trial_days: 7,
    },
    select: { id: true, slug: true },
  });

  const createdProfile = await prisma.profile.create({
    data: {
      id: ownerProfileId,
      organizationId: createdOrg.id,
      clerkUserId,
      email: params.email ?? null,
      fullName: params.fullName ?? null,
      avatarUrl: params.imageUrl ?? null,
      role: 'owner',
    },
    select: { id: true, organizationId: true, role: true },
  });

  const ensuredSocialUser = await upsertSocialUserForClerkUser({
    clerkUserId,
    organizationId: createdOrg.id,
    email: params.email,
    fullName: params.fullName,
    imageUrl: params.imageUrl,
    role: createdProfile.role ?? null,
  });

  if (ensuredSocialUser?.id && String(ensuredSocialUser.id) !== String(ownerIdPlaceholder)) {
    try {
      await prisma.social_organizations.update({
        where: { id: createdOrg.id },
        data: { owner_id: String(ensuredSocialUser.id), updated_at: new Date() },
      });
    } catch {
      // ignore
    }
  }

  // Best-effort welcome email with portal link
  try {
    const ownerEmail = params.email ? String(params.email) : null;
    if (params.sendWelcomeEmail && ownerEmail) {
      const baseUrl = getBaseUrl();
      const portalKey = createdOrg.slug || createdOrg.id;
      const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalKey))}`;
      const signInUrl = `${baseUrl}/sign-in?redirect_url=${encodeURIComponent(portalUrl)}`;
      await sendMisradWelcomeEmail({
        toEmail: ownerEmail,
        ownerName: params.fullName ? String(params.fullName) : null,
        signInUrl,
      });
    }
  } catch (e) {
    console.error('[upsertProfileForClerkUser] welcome email failed (ignored)', e);
  }

  return {
    profileId: createdProfile.id,
    organizationId: createdProfile.organizationId,
    organizationSlug: createdOrg.slug ?? null,
    role: createdProfile.role ?? null,
  };
}
/**
 * Get or create user in Supabase users table from Clerk user ID
 * This is a Server Action that can bypass RLS if needed
 */
export async function getOrCreateSupabaseUserAction(
  clerkUserId: string,
  email?: string,
  fullName?: string,
  imageUrl?: string,
  preferredOrganizationKey?: string,
  sendWelcomeEmail?: boolean
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const sessionUserId = await getCurrentUserId();
    if (!sessionUserId) {
      return createErrorResponse('Not authenticated');
    }

    if (sessionUserId !== clerkUserId) {
      return createErrorResponse('Forbidden', 'אין הרשאה לבצע פעולה זו');
    }

    const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
    if (isE2E) {
      // Playwright env: some test DBs enforce strict RLS on social_users, causing inserts to fail.
      // We avoid writes here and let workspace.ts provide E2E-safe fallbacks.
      return { success: true, userId: String(clerkUserId) };
    }

    const preferredKeyRaw = preferredOrganizationKey ? String(preferredOrganizationKey).trim() : '';
    const isOrgInviteMode = preferredKeyRaw.toLowerCase().startsWith('invite:');

    // Option A: webhook is the manager. If the user arrives with invite token, do NOT provision anything here.
    if (isOrgInviteMode) {
      return { success: true, userId: String(clerkUserId) };
    }

    const out = await upsertProfileForClerkUser({
      clerkUserId,
      email,
      fullName,
      imageUrl,
      preferredOrganizationKey,
      sendWelcomeEmail,
    });

    return { success: true, userId: out.profileId };
  } catch (error: unknown) {
    const message = getUnknownErrorMessage(error);
    console.error('[getOrCreateSupabaseUserAction] Unexpected error:', {
      error: serializeUnknownError(error),
      message,
      clerkUserId,
      email,
    });
    return createErrorResponse(error, message || 'Failed to get or create user');
  }
}

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

    // Webhook path: keep backwards compatible behavior with /api/webhooks/clerk/route.ts
    // which expects userId to be social_users.id (UUID) for downstream operations.
    const now = new Date();

    const existing = await prisma.social_users.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { id: true },
    });

    const updateData: {
      email: string | null;
      full_name: string | null;
      avatar_url: string | null;
      updated_at: Date;
    } = {
      email: email ? String(email).trim().toLowerCase() : null,
      full_name: params.fullName ? String(params.fullName) : null,
      avatar_url: params.imageUrl ? String(params.imageUrl) : null,
      updated_at: now,
    };

    if (existing?.id) {
      await prisma.social_users.update({
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

    const created = await prisma.social_users.create({
      data: createData,
      select: { id: true },
    });

    return { success: true, userId: created?.id ? String(created.id) : undefined };
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'Failed to sync user from webhook');
  }
}

export async function provisionCurrentUserWorkspaceAction(): Promise<{
  success: boolean;
  organizationKey?: string;
  error?: string;
}> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated');
    }

    let pendingPlan: PackageType | undefined = undefined;
    try {
      const jar = await cookies();
      const cookieVal = jar.get('pending_plan')?.value;
      const candidate = String(cookieVal || '').trim();
      if (candidate && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, candidate)) {
        pendingPlan = candidate as PackageType;
      }
    } catch {
      pendingPlan = undefined;
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress
      ? String(user.emailAddresses[0].emailAddress)
      : undefined;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || undefined;
    const imageUrl = user?.imageUrl ? String(user.imageUrl) : undefined;

    const out = await upsertProfileForClerkUser({
      clerkUserId,
      email,
      fullName,
      imageUrl,
      preferredOrganizationKey: undefined,
      pendingPlan,
      sendWelcomeEmail: false,
    });

    if (pendingPlan) {
      try {
        const jar = await cookies();
        jar.delete('pending_plan');
      } catch {
        // ignore
      }
    }

    const organizationKey = String(out.organizationSlug || out.organizationId);
    return { success: true, organizationKey };
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'Failed to provision workspace');
  }
}

/**
 * Get current user's Supabase ID
 */
export async function getCurrentSupabaseUserId(): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated');
    }

    const result = await getOrCreateSupabaseUserAction(clerkUserId);
    return result;
  } catch (error: unknown) {
    console.error('Error in getCurrentSupabaseUserId:', error);
    return createErrorResponse('Failed to get user ID', getUnknownErrorMessage(error) || 'Failed to get user ID');
  }
}

/**
 * Get current user info including role and organizationId
 */
export async function getCurrentUserInfo(): Promise<{
  success: boolean;
  userId?: string;
  role?: string;
  organizationId?: string;
  error?: string;
}> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated');
    }

    // Bootstrap: ensure profile exists
    const sync = await getOrCreateSupabaseUserAction(clerkUserId);
    if (!sync.success || !sync.userId) {
      return createErrorResponse('Failed to get user', sync.error);
    }

    // Resolve org+role by clerkUserId (allowed by tenant-guard exception)
    const profile = await prisma.profile.findFirst({
      where: { clerkUserId: String(clerkUserId) },
      select: { id: true, organizationId: true, role: true },
    });

    // Soft mode: if webhook provisioning hasn't completed yet, return success without org.
    if (!profile?.id || !profile.organizationId) {
      return {
        success: true,
        userId: sync.userId,
        role: 'team_member',
        organizationId: undefined,
      };
    }

    return {
      success: true,
      userId: profile.id,
      role: profile.role || 'team_member',
      organizationId: profile.organizationId,
    };
  } catch (error: unknown) {
    console.error('Error in getCurrentUserInfo:', error);
    return createErrorResponse('Failed to get user info', getUnknownErrorMessage(error) || 'Failed to get user info');
  }
}

/**
 * Get user role from users table (Server Action - bypasses RLS with SERVICE_ROLE_KEY)
 * Role is now stored directly in the users table: 'super_admin' | 'owner' | 'team_member'
 */
export async function getUserRoleFromSupabaseAction(
  supabaseUserId: string
): Promise<{ success: boolean; role?: string; organizationId?: string; error?: string }> {
  try {
    const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
    if (isE2E) {
      const e2eOrgSlug = String(process.env.E2E_ORG_SLUG || '').trim();
      return {
        success: true,
        role: 'super_admin',
        organizationId: e2eOrgSlug || undefined,
      };
    }

    // Backwards compatibility: this API kept the name but now resolves role via the current clerk user.
    // The old argument is ignored.
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return { success: true, role: 'team_member' };
    }

    const profile = await prisma.profile.findFirst({
      where: { clerkUserId: String(clerkUserId) },
      select: { role: true, organizationId: true },
    });

    return {
      success: true,
      role: profile?.role || 'team_member',
      organizationId: profile?.organizationId || undefined,
    };
  } catch (error: unknown) {
    console.error('[getUserRoleFromSupabaseAction] Error getting role:', error);
    return createErrorResponse('Failed to get user role', getUnknownErrorMessage(error) || 'Failed to get user role');
  }
}
