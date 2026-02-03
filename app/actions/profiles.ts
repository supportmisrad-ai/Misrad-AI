'use server';

import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { ActionResult } from '@/lib/errorHandler';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type ProfileRecord = {
  id: string;
  organization_id: string;
  clerk_user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  notification_preferences: unknown;
  two_factor_enabled: boolean | null;
  ui_preferences: unknown;
  social_profile: unknown;
  billing_info: unknown;
  created_at: string | null;
  updated_at: string | null;
};

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

function normalizeJson(value: unknown): Prisma.InputJsonValue {
  if (value == null) return {} as Prisma.InputJsonValue;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value as unknown as Prisma.InputJsonValue;
  }

  const obj = asObject(value);
  return (obj ?? {}) as unknown as Prisma.InputJsonValue;
}

function getWorkspaceId(workspace: unknown): string {
  const obj = asObject(workspace) ?? {};
  const id = obj.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : '';
}

function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  return null;
}

function toProfileRecord(row: unknown): ProfileRecord {
  const r = asObject(row) ?? {};
  return {
    id: String(r.id || ''),
    organization_id: String(r.organizationId || ''),
    clerk_user_id: String(r.clerkUserId || ''),
    email: toStringOrNull(r.email),
    full_name: toStringOrNull(r.fullName),
    role: toStringOrNull(r.role),
    avatar_url: toStringOrNull(r.avatarUrl),
    phone: toStringOrNull(r.phone),
    location: toStringOrNull(r.location),
    bio: toStringOrNull(r.bio),
    notification_preferences: r.notificationPreferences ?? {},
    two_factor_enabled: toBooleanOrNull(r.twoFactorEnabled),
    ui_preferences: r.uiPreferences ?? {},
    social_profile: r.socialProfile ?? {},
    billing_info: r.billingInfo ?? {},
    created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt ? String(r.createdAt) : null,
    updated_at: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt ? String(r.updatedAt) : null,
  };
}

async function getMyProfileRow(params: {
  orgSlug: string;
  clerkUserId: string;
}): Promise<ActionResult<{ profile: ProfileRecord; workspace: { id: string } }>> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const workspaceId = getWorkspaceId(workspace);

  try {
    const row = await prisma.profile.findFirst({
      where: {
        organizationId: String(workspaceId),
        clerkUserId: String(params.clerkUserId),
      },
    });

    const profile = row ? toProfileRecord(row) : ({} as ProfileRecord);
    return createSuccessResponse({ profile, workspace: { id: String(workspaceId || '') } });
  } catch (error: unknown) {
    const msg = getUnknownErrorMessage(error);
    if (msg && (msg.includes('does not exist') || msg.includes('relation') || msg.includes('profiles'))) {
      return createErrorResponse<{ profile: ProfileRecord; workspace: { id: string } }>(
        error,
        'טבלת profiles עדיין לא קיימת. יש להריץ את הסקריפט scripts/db-setup/create-profiles-table.sql בסופאבייס.'
      );
    }
    return createErrorResponse<{ profile: ProfileRecord; workspace: { id: string } }>(error, 'שגיאה בטעינת פרופיל');
  }
}

async function bootstrapProfile(params: {
  orgSlug: string;
  clerkUserId: string;
}): Promise<ActionResult<{ profile: ProfileRecord; workspace: { id: string } }>> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  const workspaceId = getWorkspaceId(workspace);

  let socialUser: unknown = null;
  try {
    socialUser = await prisma.social_users.findUnique({
      where: { clerk_user_id: String(params.clerkUserId) },
      select: { email: true, full_name: true, avatar_url: true },
    });
  } catch {
    socialUser = null;
  }

  const socialUserObj = asObject(socialUser) ?? {};

  const email = socialUserObj.email == null ? null : String(socialUserObj.email);

  let nexusUser: unknown = null;
  if (email) {
    try {
      nexusUser = await prisma.nexusUser.findFirst({
        where: { email: String(email) },
        select: {
          phone: true,
          location: true,
          bio: true,
          notificationPreferences: true,
          twoFactorEnabled: true,
          billingInfo: true,
          uiPreferences: true,
        },
      });
    } catch {
      nexusUser = null;
    }
  }

  const nexusUserObj = asObject(nexusUser) ?? {};

  try {
    const created = await prisma.profile.create({
      data: {
        organizationId: String(workspaceId),
        clerkUserId: String(params.clerkUserId),
        email: email,
        fullName: socialUserObj.full_name == null ? null : String(socialUserObj.full_name),
        avatarUrl: socialUserObj.avatar_url == null ? null : String(socialUserObj.avatar_url),
        role: null,
        phone: nexusUserObj.phone == null ? null : String(nexusUserObj.phone),
        location: nexusUserObj.location == null ? null : String(nexusUserObj.location),
        bio: nexusUserObj.bio == null ? null : String(nexusUserObj.bio),
        notificationPreferences: normalizeJson(nexusUserObj.notificationPreferences),
        twoFactorEnabled: nexusUserObj.twoFactorEnabled == null ? false : Boolean(nexusUserObj.twoFactorEnabled),
        uiPreferences: normalizeJson(nexusUserObj.uiPreferences),
        socialProfile: {},
        billingInfo: normalizeJson(nexusUserObj.billingInfo),
      },
    });

    return createSuccessResponse({ profile: toProfileRecord(created), workspace: { id: String(workspaceId || '') } });
  } catch (error: unknown) {
    const msg = String(getUnknownErrorMessage(error) || '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('profiles')) {
      return createErrorResponse<{ profile: ProfileRecord; workspace: { id: string } }>(
        error,
        'טבלת profiles עדיין לא קיימת. יש להריץ את הסקריפט scripts/db-setup/create-profiles-table.sql בסופאבייס.'
      );
    }
    return createErrorResponse<{ profile: ProfileRecord; workspace: { id: string } }>(error, 'שגיאה ביצירת פרופיל');
  }
}

export async function getMyProfile(params: { orgSlug: string }): Promise<{
  success: boolean;
  data?: { profile: ProfileRecord };
  migrated?: boolean;
  error?: string;
}> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated', 'נדרשת התחברות');
    }

    const existing = await getMyProfileRow({ orgSlug: params.orgSlug, clerkUserId });
    if (!existing.success) return { success: false, error: existing.error };

    const existingObj = asObject(existing.data) ?? {};
    const existingProfile = (existingObj.profile as ProfileRecord | null) ?? null;
    if (existingProfile?.id) {
      return createSuccessResponse({ profile: existingProfile });
    }

    const boot = await bootstrapProfile({ orgSlug: params.orgSlug, clerkUserId });
    if (!boot.success) return { success: false, error: boot.error };

    const bootObj = asObject(boot.data) ?? {};
    return { success: true, data: { profile: bootObj.profile as ProfileRecord }, migrated: true };
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת פרופיל');
  }
}

export async function upsertMyProfile(params: {
  orgSlug: string;
  updates: {
    fullName?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    location?: string | null;
    bio?: string | null;
    notificationPreferences?: unknown;
    twoFactorEnabled?: boolean | null;
    uiPreferences?: unknown;
    socialProfile?: unknown;
    billingInfo?: unknown;
  };
}): Promise<{ success: boolean; data?: { profile: ProfileRecord }; error?: string }> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated', 'נדרשת התחברות');
    }

    const ensured = await getMyProfile({ orgSlug: params.orgSlug });
    const profileId = ensured.success ? ensured.data?.profile?.id : null;
    if (!ensured.success || !profileId) {
      return createErrorResponse(ensured.error || 'Failed to load profile', ensured.error || 'שגיאה בטעינת פרופיל');
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const patch: Record<string, unknown> = {};
    if (typeof params.updates.fullName !== 'undefined') patch.fullName = params.updates.fullName;
    if (typeof params.updates.role !== 'undefined') patch.role = params.updates.role;
    if (typeof params.updates.avatarUrl !== 'undefined') patch.avatarUrl = params.updates.avatarUrl;
    if (typeof params.updates.phone !== 'undefined') patch.phone = params.updates.phone;
    if (typeof params.updates.location !== 'undefined') patch.location = params.updates.location;
    if (typeof params.updates.bio !== 'undefined') patch.bio = params.updates.bio;
    if (typeof params.updates.twoFactorEnabled !== 'undefined') patch.twoFactorEnabled = params.updates.twoFactorEnabled;
    if (typeof params.updates.notificationPreferences !== 'undefined') patch.notificationPreferences = normalizeJson(params.updates.notificationPreferences);
    if (typeof params.updates.uiPreferences !== 'undefined') patch.uiPreferences = normalizeJson(params.updates.uiPreferences);
    if (typeof params.updates.socialProfile !== 'undefined') patch.socialProfile = normalizeJson(params.updates.socialProfile);
    if (typeof params.updates.billingInfo !== 'undefined') patch.billingInfo = normalizeJson(params.updates.billingInfo);

    const updatedCount = await prisma.profile.updateMany({
      where: {
        id: String(profileId),
        organizationId: String(workspace.id),
        clerkUserId: String(clerkUserId),
      },
      data: patch,
    });
    if (!updatedCount.count) {
      return createErrorResponse('Failed', 'שגיאה בעדכון פרופיל');
    }

    const updated = await prisma.profile.findFirst({
      where: {
        id: String(profileId),
        organizationId: String(workspace.id),
        clerkUserId: String(clerkUserId),
      },
    });
    if (!updated) {
      return createErrorResponse('Failed', 'שגיאה בעדכון פרופיל');
    }

    return createSuccessResponse({ profile: toProfileRecord(updated) });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בעדכון פרופיל');
  }
}
