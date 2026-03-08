'use server';



import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/server/logger';
import { currentUser } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';
import { BILLING_PACKAGES, type PackageType } from '@/lib/billing/pricing';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { generateOrgSlug, generateUniqueOrgSlug } from '@/lib/server/orgSlug';
import { getBaseUrl } from '@/lib/utils';
import { sendMisradWelcomeEmail } from '@/lib/email';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';


import { asObjectLoose as asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';

/**
 * Safe wrapper around revalidatePath.
 * Next.js forbids revalidatePath during Server Component render.
 * Functions in this file are dual-use (called from both server actions AND SSR render),
 * so we catch the error gracefully in render context.
 */
function safeRevalidate() {
  try {
    revalidatePath('/', 'layout');
  } catch {
    // Expected in SSR render context — silently ignore
  }
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
    // Fallback: if own properties produced nothing, try String / JSON
    if (Object.keys(out).length === 0) {
      const str = String(error);
      if (str && str !== '[object Object]') {
        out._string = str;
      }
      try {
        const json = JSON.stringify(error);
        if (json && json !== '{}') {
          out._json = json;
        }
      } catch { /* ignore */ }
      if (Object.keys(out).length === 0) {
        out._type = Object.prototype.toString.call(error);
        out._proto = error?.constructor?.name ?? 'unknown';
      }
    }
    return out;
  }

  return { value: error };
}

function isUuidLike(value: string | null | undefined): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
}

async function upsertOrganizationUserForClerkUser(params: {
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

  // וידוא שה-organization קיים לפני יצירת social_user
  const orgExists = await prisma.organization.findFirst({
    where: {
      OR: [
        { id: organizationId },
        { slug: organizationId }
      ]
    },
    select: { id: true }
  });

  if (!orgExists?.id) {
    logger.warn('upsertOrganizationUserForClerkUser', 'organization ${organizationId} not found - skipping organization_user creation');
    return null;
  }

  const validOrgId = String(orgExists.id);

  const existing = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: { id: true, organization_id: true, role: true },
  });

  if (existing?.id) {
    await prisma.organizationUser.update({
      where: { clerk_user_id: clerkUserId },
      data: {
        email: emailLower,
        full_name: fullName,
        avatar_url: avatarUrl,
        organization_id: validOrgId,
        ...(role ? { role } : {}),
        updated_at: now,
      },
    });
    return {
      id: String(existing.id),
      organization_id: validOrgId,
      role: role ?? (existing.role ? String(existing.role) : null),
    };
  }

  const created = await prisma.organizationUser.create({
    data: {
      clerk_user_id: clerkUserId,
      email: emailLower,
      full_name: fullName,
      avatar_url: avatarUrl,
      organization_id: validOrgId,
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

async function upsertSocialUserForClerkUser(params: {
  clerkUserId: string;
  organizationId: string;
  email?: string;
  fullName?: string;
  imageUrl?: string;
  role?: string | null;
}): Promise<{ id: string; organization_id: string | null; role: string | null } | null> {
  return await upsertOrganizationUserForClerkUser(params);
}

async function upsertProfileForClerkUser(params: {
  clerkUserId: string;
  email?: string;
  fullName?: string;
  imageUrl?: string;
  preferredOrganizationKey?: string;
  pendingPlan?: PackageType;
  pendingSoloModule?: string;
  pendingSeats?: number;
  sendWelcomeEmail?: boolean;
  _resolvedClerkUser?: { id: string } | null;
}): Promise<{ profileId: string; organizationId: string; organizationSlug?: string | null; role?: string | null }> {
  const clerkUserId = String(params.clerkUserId || '').trim();
  if (!clerkUserId) throw new Error('Missing clerkUserId');

  const preferredKeyRaw = params.preferredOrganizationKey ? String(params.preferredOrganizationKey).trim() : '';
  const isOrgInviteMode = preferredKeyRaw.toLowerCase().startsWith('invite:');
  const isEmployeeInviteMode = preferredKeyRaw.toLowerCase().startsWith('employee-invite:');

  // ✅ CRITICAL SECURITY FIX: Validate this is for the correct user (unless webhook call)
  const isWebhookCall = isOrgInviteMode || isEmployeeInviteMode;
  if (!isWebhookCall) {
    try {
      // Reuse already-resolved Clerk user to avoid duplicate network call
      const currentUserData = params._resolvedClerkUser ?? await currentUser();
      if (currentUserData?.id !== clerkUserId) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[upsertProfileForClerkUser] User ID mismatch - potential session confusion:', {
            expected: clerkUserId,
            actual: currentUserData?.id,
            timestamp: new Date().toISOString(),
          });
        }
        throw new Error('User validation failed - session mismatch');
      }
    } catch (error) {
      // If currentUser() fails or validation fails, throw to prevent data corruption
      if (error instanceof Error && error.message === 'User validation failed - session mismatch') {
        throw error;
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('[upsertProfileForClerkUser] Validation error:', error);
      }
      throw new Error('Failed to validate user context');
    }
  }

  const safePreferredOrganizationKey = isOrgInviteMode || isEmployeeInviteMode ? preferredKeyRaw : undefined;

  // If profile already exists - best effort update
  const existing = await prisma.profile.findFirst(
    withPrismaTenantIsolationOverride(
      {
        where: { clerkUserId },
        select: { id: true, organizationId: true, role: true },
      },
      {
        reason: 'onboard_or_provision_lookup_existing_profile',
        source: 'app/actions/users.ts',
      }
    )
  );

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
        org = await prisma.organization.findFirst({
          where: { id: existingOrgKey },
          select: { id: true, slug: true },
        });
      } else {
        org = await prisma.organization.findFirst({
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
      await upsertOrganizationUserForClerkUser({
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
  if (safePreferredOrganizationKey && !isEmployeeInviteMode) {
    const where = isUuidLike(safePreferredOrganizationKey)
      ? {
          OR: [{ id: safePreferredOrganizationKey }, { slug: safePreferredOrganizationKey }],
        }
      : {
          slug: safePreferredOrganizationKey,
        };

    const org = await prisma.organization.findFirst({
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

    const inviteRow = await prisma.nexusEmployeeInvitationLink.findUnique({
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
    const org = await prisma.organization.findFirst({
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

  // Default: create an org + owner profile
  const ownerProfileId = crypto.randomUUID();
  const orgName = params.fullName || params.email || 'Organization';
  const emailPrefix = params.email ? String(params.email).split('@')[0] : '';
  const fullNameSlug = params.fullName ? generateOrgSlug(params.fullName) : '';
  const emailPrefixSlug = emailPrefix ? generateOrgSlug(emailPrefix) : '';
  const slugBase = await generateUniqueOrgSlug(fullNameSlug || emailPrefixSlug || 'org');

  const pendingPlanRaw = params.pendingPlan ? String(params.pendingPlan).trim() : '';
  const pendingPlan = pendingPlanRaw && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, pendingPlanRaw) ? (pendingPlanRaw as PackageType) : null;
  const soloModuleRaw = params.pendingSoloModule ? String(params.pendingSoloModule).trim() : '';
  const validSoloModules: OSModuleKey[] = ['system', 'social', 'client', 'operations', 'nexus'];
  const soloModule: OSModuleKey = validSoloModules.includes(soloModuleRaw as OSModuleKey) ? (soloModuleRaw as OSModuleKey) : 'system';
  const planModules: OSModuleKey[] | null = pendingPlan
    ? pendingPlan === 'solo'
      ? ([soloModule] as OSModuleKey[])
      : [...(BILLING_PACKAGES[pendingPlan].modules || [])]
    : null;
  const hasModule = (k: OSModuleKey): boolean => Boolean(planModules && planModules.includes(k));

  const now = new Date();
  const emailLower = params.email ? String(params.email).trim().toLowerCase() : null;
  const fullName = params.fullName ? String(params.fullName) : null;
  const avatarUrl = params.imageUrl ? String(params.imageUrl) : null;

  // ── Sequential idempotent provisioning (pooler-safe, no interactive $transaction) ──
  // Each step is idempotent via upsert/findFirst so retries after partial failure are safe.

  // Step 1: Upsert OrganizationUser (clerk_user_id is @unique)
  const socialUser = await prisma.organizationUser.upsert(
    withPrismaTenantIsolationOverride(
      {
        where: { clerk_user_id: clerkUserId },
        create: {
          clerk_user_id: clerkUserId,
          email: emailLower,
          full_name: fullName,
          avatar_url: avatarUrl,
          organization_id: null,
          role: 'owner',
          created_at: now,
          updated_at: now,
        },
        update: {
          email: emailLower ?? undefined,
          full_name: fullName ?? undefined,
          avatar_url: avatarUrl ?? undefined,
          updated_at: now,
        },
        select: { id: true, organization_id: true },
      },
      {
        reason: 'bootstrap_workspace_provision',
        source: 'app/actions/users.ts#upsertProfileForClerkUser',
        suppressReporting: true,
      }
    )
  );

  // Step 2: Create Organization (or recover from previous partial attempt)
  let orgId = socialUser.organization_id ? String(socialUser.organization_id) : '';
  let orgSlug: string | null = null;

  if (!orgId) {
    // Check if an org was already created for this user in a previous failed attempt
    const existingOwnedOrg = await prisma.organization.findFirst({
      where: { owner_id: socialUser.id },
      select: { id: true, slug: true },
    });

    if (existingOwnedOrg) {
      orgId = existingOwnedOrg.id;
      orgSlug = existingOwnedOrg.slug;
    } else {
      const tempOrgId = crypto.randomUUID();
      const newOrg = await prisma.organization.create({
        data: {
          id: tempOrgId,
          name: orgName,
          slug: slugBase || null,
          owner_id: socialUser.id,
          has_nexus: pendingPlan ? hasModule('nexus') : false,
          has_system: pendingPlan ? hasModule('system') : false,
          has_social: pendingPlan ? hasModule('social') : false,
          has_finance: pendingPlan ? true : false, // Finance is a free bonus for any paid package
          has_client: pendingPlan ? hasModule('client') : false,
          has_operations: pendingPlan ? hasModule('operations') : false,
          subscription_status: 'trial',
          subscription_plan: pendingPlan ? String(pendingPlan) : null,
          trial_start_date: now,
          trial_days: DEFAULT_TRIAL_DAYS,
          created_at: now,
          updated_at: now,
        },
        select: { id: true, slug: true },
      });
      orgId = newOrg.id;
      orgSlug = newOrg.slug;
    }

    // Step 3: Link OrganizationUser to Organization
    await prisma.organizationUser.update({
      where: { clerk_user_id: clerkUserId },
      data: { organization_id: orgId, updated_at: now },
    });
  } else {
    // Retry scenario: user already has an org — fetch slug
    const existingOrg = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { slug: true },
    });
    orgSlug = existingOrg?.slug ?? null;
  }

  // Step 4: Upsert Profile (@@unique([organizationId, clerkUserId]))
  const createdProfile = await prisma.profile.upsert({
    where: {
      organizationId_clerkUserId: { organizationId: orgId, clerkUserId },
    },
    create: {
      id: ownerProfileId,
      organizationId: orgId,
      clerkUserId,
      email: params.email ?? null,
      fullName: params.fullName ?? null,
      avatarUrl: params.imageUrl ?? null,
      role: 'owner',
    },
    update: {
      email: params.email ?? undefined,
      fullName: params.fullName ?? undefined,
      avatarUrl: params.imageUrl ?? undefined,
    },
    select: { id: true, organizationId: true, role: true },
  });

  const createdOrg = { id: orgId, slug: orgSlug };

  // Fire-and-forget: auto-create BusinessClient for the new org (non-blocking)
  void import('@/app/actions/business-clients')
    .then(({ ensureBusinessClientForOrg }) => ensureBusinessClientForOrg(createdOrg.id))
    .catch((e) => logger.error('upsertProfileForClerkUser', 'ensureBusinessClientForOrg failed (ignored)', e));

  // Fire-and-forget: welcome email with portal link (non-blocking)
  const ownerEmail = params.email ? String(params.email) : null;
  if (params.sendWelcomeEmail && ownerEmail) {
    const baseUrl = getBaseUrl();
    const portalKey = createdOrg.slug || createdOrg.id;
    const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalKey))}`;
    const signInUrl = `${baseUrl}/sign-in?redirect_url=${encodeURIComponent(portalUrl)}`;
    void sendMisradWelcomeEmail({
      toEmail: ownerEmail,
      ownerName: params.fullName ? String(params.fullName) : null,
      signInUrl,
    }).catch((e) => logger.error('upsertProfileForClerkUser', 'welcome email failed (ignored)', e));
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
      safeRevalidate();
      return { success: true, userId: String(clerkUserId) };
    }

    return await withTenantIsolationContext(
      { source: 'app/actions/users.getOrCreateSupabaseUserAction', reason: 'user_bootstrap', suppressReporting: true },
      async () => {
        const preferredKeyRaw = preferredOrganizationKey ? String(preferredOrganizationKey).trim() : '';
        const isOrgInviteMode = preferredKeyRaw.toLowerCase().startsWith('invite:');
        const isEmployeeInviteMode = preferredKeyRaw.toLowerCase().startsWith('employee-invite:');

        const safePreferredOrganizationKey = isOrgInviteMode || isEmployeeInviteMode ? preferredKeyRaw : undefined;

        // Option A: webhook is the manager. If the user arrives with invite token, do NOT provision anything here.
        if (isOrgInviteMode) {
          safeRevalidate();
          return { success: true, userId: String(clerkUserId) };
        }

        const out = await upsertProfileForClerkUser({
          clerkUserId,
          email,
          fullName,
          imageUrl,
          preferredOrganizationKey: safePreferredOrganizationKey,
          sendWelcomeEmail,
        });

        safeRevalidate();

        return { success: true, userId: out.profileId };
      }
    );
  } catch (error: unknown) {
    const message = getUnknownErrorMessage(error);
    logger.error('getOrCreateSupabaseUserAction', 'Unexpected error:', {
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
    const sessionUserId = await getCurrentUserId();
    if (!sessionUserId) {
      return createErrorResponse('Not authenticated');
    }
    try {
      await requireSuperAdmin();
    } catch {
      return createErrorResponse('Forbidden', 'אין הרשאה לבצע פעולה זו');
    }

    const clerkUserId = String(params.clerkUserId || '').trim();
    const organizationId = String(params.organizationId || '').trim();
    if (!clerkUserId || !organizationId) {
      return createErrorResponse('Missing clerkUserId/organizationId');
    }

    return await withTenantIsolationContext(
      { source: 'app/actions/users.ensureProfileForClerkUserInOrganizationAction', reason: 'admin_ensure_profile', mode: 'global_admin', isSuperAdmin: true, organizationId },
      async () => {
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
          safeRevalidate();
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

        safeRevalidate();

        return { success: true, profileId: created.id };
      }
    );
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

    return await withTenantIsolationContext(
      { source: 'app/actions/users.getOrCreateSupabaseUserFromClerkWebhookAction', reason: 'webhook_user_sync', suppressReporting: true },
      async () => {
        const email = params.email ? String(params.email).trim() : undefined;

        // Webhook path: keep backwards compatible behavior with /api/webhooks/clerk/route.ts
        // which expects userId to be social_users.id (UUID) for downstream operations.
        const now = new Date();

        const existing = await prisma.organizationUser.findUnique({
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
          await prisma.organizationUser.update({
            where: { clerk_user_id: clerkUserId },
            data: updateData,
            select: { id: true },
          });

          safeRevalidate();

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

        safeRevalidate();

        return { success: true, userId: created?.id ? String(created.id) : undefined };
      }
    );
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

    return await withTenantIsolationContext(
      { source: 'app/actions/users.provisionCurrentUserWorkspaceAction', reason: 'workspace_provision', suppressReporting: true },
      async () => {
        let pendingPlan: PackageType | undefined = undefined;
        let pendingSoloModule: string | undefined = undefined;
        let pendingSeats: number | undefined = undefined;
        try {
          const jar = await cookies();
          const cookieVal = jar.get('pending_plan')?.value;
          const candidate = String(cookieVal || '').trim();
          if (candidate && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, candidate)) {
            pendingPlan = candidate as PackageType;
          }
          const moduleCookie = jar.get('pending_module')?.value;
          if (moduleCookie) {
            pendingSoloModule = String(moduleCookie).trim() || undefined;
          }
          const seatsCookie = jar.get('pending_seats')?.value;
          if (seatsCookie) {
            const n = Number(seatsCookie);
            if (Number.isFinite(n) && n > 0) {
              pendingSeats = Math.floor(n);
            }
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
          pendingSoloModule,
          pendingSeats,
          sendWelcomeEmail: true,
          _resolvedClerkUser: user,
        });

        if (pendingPlan) {
          try {
            const jar = await cookies();
            jar.delete('pending_plan');
            jar.delete('pending_seats');
            jar.delete('pending_module');
          } catch {
            // ignore
          }
        }

        const organizationKey = String(out.organizationSlug || out.organizationId);
        safeRevalidate();
        return { success: true, organizationKey };
      }
    );
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

    return await withTenantIsolationContext(
      { source: 'app/actions/users.getCurrentSupabaseUserId', reason: 'get_current_user', suppressReporting: true },
      async () => {
        const result = await getOrCreateSupabaseUserAction(clerkUserId);
        return result;
      }
    );
  } catch (error: unknown) {
    logger.error('upsertOrganizationUserForClerkUser', 'Error in getCurrentSupabaseUserId:', error);
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

    return await withTenantIsolationContext(
      { source: 'app/actions/users.getCurrentUserInfo', reason: 'get_current_user_info', suppressReporting: true },
      async () => {
        // Bootstrap: ensure profile exists
        const sync = await getOrCreateSupabaseUserAction(clerkUserId);
        if (!sync.success || !sync.userId) {
          return createErrorResponse('Failed to get user', sync.error);
        }

        // Resolve org+role by clerkUserId (allowed by tenant-guard exception)
        const profile = await prisma.profile.findFirst(
          withPrismaTenantIsolationOverride(
            {
              where: { clerkUserId: String(clerkUserId) },
              select: { id: true, organizationId: true, role: true },
            },
            {
              reason: 'clerk_webhook_sync_lookup_profile',
              source: 'app/actions/users.ts',
            }
          )
        );

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
      }
    );
  } catch (error: unknown) {
    logger.error('upsertOrganizationUserForClerkUser', 'Error in getCurrentUserInfo:', error);
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
      safeRevalidate();
      return { success: true, role: 'team_member' };
    }

    return await withTenantIsolationContext(
      { source: 'app/actions/users.getUserRoleFromSupabaseAction', reason: 'get_user_role', suppressReporting: true },
      async () => {
        const profile = await prisma.profile.findFirst(
          withPrismaTenantIsolationOverride(
            {
              where: { clerkUserId: String(clerkUserId) },
              select: { role: true, organizationId: true },
            },
            {
              reason: 'get_user_role_lookup_by_clerk_id',
              source: 'app/actions/users.ts',
            }
          )
        );

        return {
          success: true,
          role: profile?.role || 'team_member',
          organizationId: profile?.organizationId || undefined,
        };
      }
    );
  } catch (error: unknown) {
    logger.error('getUserRoleFromSupabaseAction', 'Error getting role:', error);
    return createErrorResponse('Failed to get user role', getUnknownErrorMessage(error) || 'Failed to get user role');
  }
}
