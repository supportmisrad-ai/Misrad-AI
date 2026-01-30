'use server';

import { createClient } from '@/lib/supabase';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

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

function normalizeJson(value: unknown): Record<string, unknown> {
  const obj = asObject(value);
  return obj ?? {};
}

async function getMyProfileRow(params: { orgSlug: string; clerkUserId: string }) {
  const supabase = createClient();
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', workspace.id)
    .eq('clerk_user_id', params.clerkUserId)
    .maybeSingle();

  if (error) {
    const msg = getUnknownErrorMessage(error);
    if (msg && (msg.includes('does not exist') || msg.includes('relation') || msg.includes('profiles'))) {
      return createErrorResponse(
        error,
        'טבלת profiles עדיין לא קיימת. יש להריץ את הסקריפט scripts/db-setup/create-profiles-table.sql בסופאבייס.'
      );
    }
    return createErrorResponse(error, error.message || 'שגיאה בטעינת פרופיל');
  }

  return createSuccessResponse({ profile: (asObject(data) ?? ({} as Record<string, unknown>)) as unknown as ProfileRecord, workspace });
}

async function bootstrapProfile(params: { orgSlug: string; clerkUserId: string }) {
  const supabase = createClient();
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

  const { data: socialUser } = await supabase
    .from('social_users')
    .select('email, full_name, avatar_url')
    .eq('clerk_user_id', params.clerkUserId)
    .maybeSingle();

  const socialUserObj = asObject(socialUser);
  const email = socialUserObj?.email == null ? null : String(socialUserObj.email);

  let nexusUser: unknown = null;
  if (email) {
    const res = await supabase
      .from('nexus_users')
      .select('phone, location, bio, notification_preferences, two_factor_enabled, billing_info, ui_preferences')
      .eq('email', email)
      .maybeSingle();
    // nexus_users might not exist / not accessible in some deployments; best-effort only.
    if (!res.error) {
      nexusUser = res.data;
    }
  }

  const nexusUserObj = asObject(nexusUser) ?? {};

  const insertRow: Record<string, unknown> = {
    organization_id: workspace.id,
    clerk_user_id: params.clerkUserId,
    email: email,
    full_name: socialUserObj?.full_name == null ? null : String(socialUserObj.full_name),
    role: null,
    avatar_url: socialUserObj?.avatar_url == null ? null : String(socialUserObj.avatar_url),
    phone: nexusUserObj.phone == null ? null : String(nexusUserObj.phone),
    location: nexusUserObj.location == null ? null : String(nexusUserObj.location),
    bio: nexusUserObj.bio == null ? null : String(nexusUserObj.bio),
    notification_preferences: normalizeJson(nexusUserObj.notification_preferences),
    two_factor_enabled: nexusUserObj.two_factor_enabled == null ? false : Boolean(nexusUserObj.two_factor_enabled),
    ui_preferences: normalizeJson(nexusUserObj.ui_preferences),
    social_profile: {},
    billing_info: normalizeJson(nexusUserObj.billing_info),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let created: unknown = null;
  let createError: unknown = null;

  const attemptInsert = async (row: Record<string, unknown>) => {
    const res = await supabase.from('profiles').insert(row).select('*').single();
    created = res.data;
    createError = res.error;
  };

  await attemptInsert(insertRow);

  if (createError) {
    const msg = String(getUnknownErrorMessage(createError) || '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('profiles')) {
      return createErrorResponse(
        createError,
        'טבלת profiles עדיין לא קיימת. יש להריץ את הסקריפט scripts/db-setup/create-profiles-table.sql בסופאבייס.'
      );
    }
    return createErrorResponse(createError, 'שגיאה ביצירת פרופיל');
  }

  return createSuccessResponse({ profile: (asObject(created) ?? ({} as Record<string, unknown>)) as unknown as ProfileRecord, workspace });
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
    if (!existing.success) return existing;

    const existingObj = asObject(existing.data) ?? {};
    const existingProfile = (existingObj.profile as ProfileRecord | null) ?? null;
    if (existingProfile?.id) {
      return createSuccessResponse({ profile: existingProfile });
    }

    const boot = await bootstrapProfile({ orgSlug: params.orgSlug, clerkUserId });
    if (!boot.success) return boot;

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
    const supabase = createClient();

    const updateRow: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof params.updates.fullName !== 'undefined') updateRow.full_name = params.updates.fullName;
    if (typeof params.updates.role !== 'undefined') updateRow.role = params.updates.role;
    if (typeof params.updates.avatarUrl !== 'undefined') updateRow.avatar_url = params.updates.avatarUrl;
    if (typeof params.updates.phone !== 'undefined') updateRow.phone = params.updates.phone;
    if (typeof params.updates.location !== 'undefined') updateRow.location = params.updates.location;
    if (typeof params.updates.bio !== 'undefined') updateRow.bio = params.updates.bio;
    if (typeof params.updates.twoFactorEnabled !== 'undefined') updateRow.two_factor_enabled = params.updates.twoFactorEnabled;
    if (typeof params.updates.notificationPreferences !== 'undefined') updateRow.notification_preferences = normalizeJson(params.updates.notificationPreferences);
    if (typeof params.updates.uiPreferences !== 'undefined') updateRow.ui_preferences = normalizeJson(params.updates.uiPreferences);
    if (typeof params.updates.socialProfile !== 'undefined') updateRow.social_profile = normalizeJson(params.updates.socialProfile);
    if (typeof params.updates.billingInfo !== 'undefined') updateRow.billing_info = normalizeJson(params.updates.billingInfo);

    let data: unknown = null;
    let error: unknown = null;

    const attemptUpdate = async (row: Record<string, unknown>) => {
      const res = await supabase
        .from('profiles')
        .update(row)
        .eq('id', profileId)
        .eq('organization_id', workspace.id)
        .eq('clerk_user_id', clerkUserId)
        .select('*')
        .single();
      data = res.data;
      error = res.error;
    };

    await attemptUpdate(updateRow);

    if (error) {
      return createErrorResponse(error, 'שגיאה בעדכון פרופיל');
    }

    return createSuccessResponse({ profile: (asObject(data) ?? ({} as Record<string, unknown>)) as unknown as ProfileRecord });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בעדכון פרופיל');
  }
}
