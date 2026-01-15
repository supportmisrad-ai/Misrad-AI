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
  notification_preferences: any;
  two_factor_enabled: boolean | null;
  ui_preferences: any;
  social_profile: any;
  billing_info: any;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeJson(value: any) {
  if (!value || typeof value !== 'object') return {};
  if (Array.isArray(value)) return {};
  return value;
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
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('profiles')) {
      return createErrorResponse(
        error,
        'טבלת profiles עדיין לא קיימת. יש להריץ את הסקריפט scripts/db-setup/create-profiles-table.sql בסופאבייס.'
      );
    }
    return createErrorResponse(error, error.message || 'שגיאה בטעינת פרופיל');
  }

  return createSuccessResponse({ profile: (data as any) as ProfileRecord, workspace });
}

async function bootstrapProfile(params: { orgSlug: string; clerkUserId: string }) {
  const supabase = createClient();
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

  const { data: socialUser } = await supabase
    .from('social_users')
    .select('email, full_name, avatar_url')
    .eq('clerk_user_id', params.clerkUserId)
    .maybeSingle();

  const email = (socialUser as any)?.email ?? null;

  let nexusUser: any = null;
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

  const insertRow: any = {
    organization_id: workspace.id,
    clerk_user_id: params.clerkUserId,
    email: email,
    full_name: (socialUser as any)?.full_name ?? null,
    role: null,
    avatar_url: (socialUser as any)?.avatar_url ?? null,
    phone: nexusUser?.phone ?? null,
    location: nexusUser?.location ?? null,
    bio: nexusUser?.bio ?? null,
    notification_preferences: normalizeJson(nexusUser?.notification_preferences),
    two_factor_enabled: nexusUser?.two_factor_enabled ?? false,
    ui_preferences: normalizeJson(nexusUser?.ui_preferences),
    social_profile: {},
    billing_info: normalizeJson(nexusUser?.billing_info),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let created: any = null;
  let createError: any = null;

  const attemptInsert = async (row: any) => {
    const res = await supabase.from('profiles').insert(row).select('*').single();
    created = res.data as any;
    createError = res.error as any;
  };

  await attemptInsert(insertRow);

  // Backwards compatible: if role column doesn't exist yet, retry without it.
  if (createError?.message) {
    const msg = String(createError.message).toLowerCase();
    if (msg.includes('column') && msg.includes('role')) {
      const { role: _ignored, ...withoutRole } = insertRow;
      await attemptInsert(withoutRole);
    }
  }

  if (createError) {
    const msg = String(createError.message || '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('profiles')) {
      return createErrorResponse(
        createError,
        'טבלת profiles עדיין לא קיימת. יש להריץ את הסקריפט scripts/db-setup/create-profiles-table.sql בסופאבייס.'
      );
    }
    return createErrorResponse(createError, 'שגיאה ביצירת פרופיל');
  }

  return createSuccessResponse({ profile: (created as any) as ProfileRecord, workspace });
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
      return createErrorResponse('Not authenticated', 'נדרשת התחברות') as any;
    }

    const existing = await getMyProfileRow({ orgSlug: params.orgSlug, clerkUserId });
    if (!existing.success) return existing as any;

    const existingProfile = (existing as any)?.data?.profile as ProfileRecord | null;
    if (existingProfile?.id) {
      return createSuccessResponse({ profile: existingProfile }) as any;
    }

    const boot = await bootstrapProfile({ orgSlug: params.orgSlug, clerkUserId });
    if (!boot.success) return boot as any;

    return { success: true, data: { profile: (boot as any).data.profile }, migrated: true };
  } catch (error: any) {
    return createErrorResponse(error, 'שגיאה בטעינת פרופיל') as any;
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
    notificationPreferences?: any;
    twoFactorEnabled?: boolean | null;
    uiPreferences?: any;
    socialProfile?: any;
    billingInfo?: any;
  };
}): Promise<{ success: boolean; data?: { profile: ProfileRecord }; error?: string }> {
  try {
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return createErrorResponse('Not authenticated', 'נדרשת התחברות') as any;
    }

    const ensured = await getMyProfile({ orgSlug: params.orgSlug });
    const profileId = ensured.success ? ensured.data?.profile?.id : null;
    if (!ensured.success || !profileId) {
      return createErrorResponse(ensured.error || 'Failed to load profile', ensured.error || 'שגיאה בטעינת פרופיל') as any;
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const supabase = createClient();

    const updateRow: any = {
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

    let data: any = null;
    let error: any = null;

    const attemptUpdate = async (row: any) => {
      const res = await supabase
        .from('profiles')
        .update(row)
        .eq('id', profileId)
        .eq('organization_id', workspace.id)
        .eq('clerk_user_id', clerkUserId)
        .select('*')
        .single();
      data = res.data as any;
      error = res.error as any;
    };

    await attemptUpdate(updateRow);

    // Backwards compatible: if role column doesn't exist yet, retry without it.
    if (error?.message) {
      const msg = String(error.message).toLowerCase();
      if (msg.includes('column') && msg.includes('role')) {
        const { role: _ignored, ...withoutRole } = updateRow;
        await attemptUpdate(withoutRole);
      }
    }

    if (error) {
      return createErrorResponse(error, 'שגיאה בעדכון פרופיל') as any;
    }

    return createSuccessResponse({ profile: (data as any) as ProfileRecord }) as any;
  } catch (error: any) {
    return createErrorResponse(error, 'שגיאה בעדכון פרופיל') as any;
  }
}
