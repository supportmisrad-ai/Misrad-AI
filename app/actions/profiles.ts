'use server';


import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import type { ActionResult } from '@/lib/errorHandler';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

import { asObjectLoose as asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';

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

function normalizeJson(value: unknown): Prisma.InputJsonValue {
  if (value == null) return {};
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) => normalizeJson(v));
  }

  const obj = asObject(value);
  if (!obj) return {};

  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = normalizeJson(v);
  }
  return out;
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
  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {
      try {
        const row = await prisma.profile.findFirst({
          where: {
            organizationId: String(organizationId),
            clerkUserId: String(params.clerkUserId),
          },
        });

        const profile = row ? toProfileRecord(row) : ({} as ProfileRecord);
        return createSuccessResponse({ profile, workspace: { id: String(organizationId || '') } });
      } catch (error: unknown) {
        const msg = getUnknownErrorMessage(error);
        if (msg && (msg.includes('does not exist') || msg.includes('relation') || msg.includes('profiles'))) {
          if (!ALLOW_SCHEMA_FALLBACKS) {
            throw new Error(`[SchemaMismatch] profiles missing table (${msg || 'missing relation'})`);
          }
          reportSchemaFallback({
            source: 'app/actions/profiles.getMyProfileRow',
            reason: 'profiles missing table (fallback to error response)',
            error,
            extras: { orgSlug: params.orgSlug },
          });
          return createErrorResponse<{ profile: ProfileRecord; workspace: { id: string } }>(
            error,
            'טבלת profiles עדיין לא קיימת. יש להריץ את הסקריפט scripts/db-setup/create-profiles-table.sql בסופאבייס.'
          );
        }
        return createErrorResponse<{ profile: ProfileRecord; workspace: { id: string } }>(error, 'שגיאה בטעינת פרופיל');
      }
    },
    { source: 'server_actions_profiles', reason: 'getMyProfileRow' }
  );
}

async function bootstrapProfile(params: {
  orgSlug: string;
  clerkUserId: string;
}): Promise<ActionResult<{ profile: ProfileRecord; workspace: { id: string } }>> {
  // Resolve organizationUser BEFORE entering tenant context.
  // organizationUser.findUnique({ clerk_user_id }) is unscoped and the tenant guard
  // only allows it when expected.organizationId is null (no context set).
  let socialUser: unknown = null;
  try {
    socialUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: String(params.clerkUserId) },
      select: { email: true, full_name: true, avatar_url: true },
    });
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] organizationUser lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
      );
    }
    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/profiles.bootstrapProfile',
        reason: 'organizationUser lookup schema mismatch (fallback to null)',
        error,
        extras: { orgSlug: params.orgSlug },
      });
    }
    socialUser = null;
  }

  return await withWorkspaceTenantContext(
    params.orgSlug,
    async ({ organizationId }) => {

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
        } catch (error: unknown) {
          if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
            throw new Error(
              `[SchemaMismatch] nexusUser lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
            );
          }

          if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
            reportSchemaFallback({
              source: 'app/actions/profiles.bootstrapProfile',
              reason: 'nexusUser lookup schema mismatch (fallback to null)',
              error,
              extras: { orgSlug: params.orgSlug },
            });
          }
          nexusUser = null;
        }
      }

      const nexusUserObj = asObject(nexusUser) ?? {};

      try {
        const created = await prisma.profile.create({
          data: {
            organizationId: String(organizationId),
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

        return createSuccessResponse({ profile: toProfileRecord(created), workspace: { id: String(organizationId || '') } });
      } catch (error: unknown) {
        const msg = String(getUnknownErrorMessage(error) || '').toLowerCase();
        if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('profiles')) {
          if (!ALLOW_SCHEMA_FALLBACKS) {
            throw new Error(`[SchemaMismatch] profiles missing table (${msg || 'missing relation'})`);
          }
          reportSchemaFallback({
            source: 'app/actions/profiles.bootstrapProfile',
            reason: 'profiles missing table during create (fallback to error response)',
            error,
            extras: { orgSlug: params.orgSlug },
          });
          return createErrorResponse<{ profile: ProfileRecord; workspace: { id: string } }>(
            error,
            'טבלת profiles עדיין לא קיימת. יש להריץ את הסקריפט scripts/db-setup/create-profiles-table.sql בסופאבייס.'
          );
        }
        return createErrorResponse<{ profile: ProfileRecord; workspace: { id: string } }>(error, 'שגיאה ביצירת פרופיל');
      }
    },
    { source: 'server_actions_profiles', reason: 'bootstrapProfile' }
  );
}

/**
 * Resolve sb:// avatar_url to a signed HTTPS URL before returning to client.
 * Without this, the raw sb:// ref reaches the client hook and overwrites
 * the already-signed URL from SSR, causing the avatar to disappear.
 */
async function signProfileAvatar(profile: ProfileRecord, workspaceId: string): Promise<ProfileRecord> {
  const raw = profile.avatar_url;
  if (!raw || !raw.startsWith('sb://') || !workspaceId) return profile;
  try {
    const signed = await resolveStorageUrlMaybeServiceRole(raw, 60 * 60, { organizationId: workspaceId });
    return { ...profile, avatar_url: signed || raw };
  } catch {
    return profile;
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
    const workspaceId = getWorkspaceId(existingObj.workspace);
    if (existingProfile?.id) {
      const signed = await signProfileAvatar(existingProfile, workspaceId);
      return createSuccessResponse({ profile: signed });
    }

    const boot = await bootstrapProfile({ orgSlug: params.orgSlug, clerkUserId });
    if (!boot.success) return { success: false, error: boot.error };

    const bootObj = asObject(boot.data) ?? {};
    const bootWorkspaceId = getWorkspaceId(bootObj.workspace) || workspaceId;
    const bootProfile = bootObj.profile as ProfileRecord;
    const signedBoot = await signProfileAvatar(bootProfile, bootWorkspaceId);
    return { success: true, data: { profile: signedBoot }, migrated: true };
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

    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => {
        // Build update data
        const updateData: Record<string, unknown> = {};
        if (typeof params.updates.fullName !== 'undefined') updateData.fullName = params.updates.fullName;
        if (typeof params.updates.role !== 'undefined') updateData.role = params.updates.role;
        if (typeof params.updates.avatarUrl !== 'undefined') updateData.avatarUrl = params.updates.avatarUrl;
        if (typeof params.updates.phone !== 'undefined') updateData.phone = params.updates.phone;
        if (typeof params.updates.location !== 'undefined') updateData.location = params.updates.location;
        if (typeof params.updates.bio !== 'undefined') updateData.bio = params.updates.bio;
        if (typeof params.updates.twoFactorEnabled !== 'undefined') updateData.twoFactorEnabled = params.updates.twoFactorEnabled;
        if (typeof params.updates.notificationPreferences !== 'undefined')
          updateData.notificationPreferences = normalizeJson(params.updates.notificationPreferences);
        if (typeof params.updates.uiPreferences !== 'undefined')
          updateData.uiPreferences = normalizeJson(params.updates.uiPreferences);
        if (typeof params.updates.socialProfile !== 'undefined') updateData.socialProfile = normalizeJson(params.updates.socialProfile);
        if (typeof params.updates.billingInfo !== 'undefined') updateData.billingInfo = normalizeJson(params.updates.billingInfo);

        // Single atomic upsert - handles both create and update
        const profile = await prisma.profile.upsert({
          where: {
            organizationId_clerkUserId: {
              organizationId: String(organizationId),
              clerkUserId: String(clerkUserId),
            },
          },
          update: updateData,
          create: {
            organizationId: String(organizationId),
            clerkUserId: String(clerkUserId),
            email: null, // Will be populated from Clerk on first load
            fullName: params.updates.fullName ?? null,
            role: params.updates.role ?? null,
            avatarUrl: params.updates.avatarUrl ?? null,
            phone: params.updates.phone ?? null,
            location: params.updates.location ?? null,
            bio: params.updates.bio ?? null,
            notificationPreferences: normalizeJson(params.updates.notificationPreferences),
            twoFactorEnabled: params.updates.twoFactorEnabled ?? false,
            uiPreferences: normalizeJson(params.updates.uiPreferences),
            socialProfile: normalizeJson(params.updates.socialProfile),
            billingInfo: normalizeJson(params.updates.billingInfo),
          },
        });

        // Sync avatar to nexusUser if changed (best effort, don't fail if this errors)
        if (typeof params.updates.avatarUrl !== 'undefined' && profile.email) {
          prisma.nexusUser.updateMany({
            where: { email: profile.email, organizationId: String(organizationId) },
            data: { avatar: params.updates.avatarUrl },
          }).catch(() => { /* ignore sync errors */ });
        }

        return createSuccessResponse({ profile: toProfileRecord(profile) });
      },
      { source: 'server_actions_profiles', reason: 'upsertMyProfile' }
    );
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בעדכון פרופיל');
  }
}
