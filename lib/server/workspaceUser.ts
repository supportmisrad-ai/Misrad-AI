import 'server-only';

import { cache } from 'react';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { findUserGlobalByEmail } from '@/lib/db';
import { requireWorkspaceAccessByOrgSlug, requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  const v = obj?.[key];
  return typeof v === 'string' ? v : null;
}

function normalizeRoleFromClerk(clerk: unknown): string {
  const clerkObj = asObject(clerk);
  const publicMetadata = asObject(clerkObj?.publicMetadata);
  const privateMetadata = asObject(clerkObj?.privateMetadata);
  const unsafeMetadata = asObject(clerkObj?.unsafeMetadata);

  const roleFromClerk = publicMetadata?.role ?? privateMetadata?.role ?? unsafeMetadata?.role ?? null;
  if (typeof roleFromClerk === 'string') return roleFromClerk;
  const roleObj = asObject(roleFromClerk);
  return getStringProp(roleObj, 'role') ?? 'עובד';
}

function isPrismaMissingRelationError(err: unknown): boolean {
  const obj = asObject(err);
  const code = String(getStringProp(obj, 'code') || '');
  const msg = String(getStringProp(obj, 'message') || '').toLowerCase();
  // P2022 is a missing-column error; avoid treating it as a missing table/relation.
  if (code === 'P2022') return false;
  return code === 'P2021' || (msg.includes('relation') && msg.includes('does not exist'));
}

function isPrismaMissingColumnError(err: unknown): boolean {
  const obj = asObject(err);
  const code = String(getStringProp(obj, 'code') || '');
  const msg = String(getStringProp(obj, 'message') || '').toLowerCase();
  return code === 'P2022' || (msg.includes('the column') && msg.includes('does not exist'));
}

function throwMissingProfilesTableDevError(params: { phase: string; error: unknown }) {
  const errorObj = asObject(params.error);
  const code = String(getStringProp(errorObj, 'code') || '');
  const raw = String(getStringProp(errorObj, 'message') || '');
  const hint =
    "טבלת public.profiles לא קיימת (או שלא נטענה ל-schema cache של Supabase/PostgREST).\n" +
    "כדי לתקן: הרץ ב-Supabase SQL Editor את scripts/db-setup/create-profiles-table.sql (או scripts/db-setup/supabase-complete-schema.sql),\n" +
    "וודא ש-NEXT_PUBLIC_SUPABASE_URL מצביע לפרויקט הנכון. לאחר מכן רענן את ה-API (לעיתים מספיק להמתין דקה/Restart ל-dev server).";
  throw new Error(`[DB][profiles][${params.phase}] ${hint} (code=${code || 'n/a'} message=${raw})`);
}

function throwMissingNexusUsersTableDevError(params: { phase: string; error: unknown }) {
  const errorObj = asObject(params.error);
  const code = String(getStringProp(errorObj, 'code') || '');
  const raw = String(getStringProp(errorObj, 'message') || '');
  const hint =
    "טבלת public.nexus_users לא קיימת (או שלא נטענה ל-schema cache של Supabase/PostgREST).\n" +
    "כדי לתקן: ודא שהמיגרציות רצות על אותו פרויקט Supabase (prisma/migrations/* או scripts/db-setup/*),\n" +
    "ואז רענן את ה-API (לעיתים מספיק להמתין דקה/Restart ל-dev server).";
  throw new Error(`[DB][nexus_users][${params.phase}] ${hint} (code=${code || 'n/a'} message=${raw})`);
}

function throwMissingNexusUsersColumnDevError(params: { phase: string; error: unknown }) {
  const errorObj = asObject(params.error);
  const code = String(getStringProp(errorObj, 'code') || '');
  const raw = String(getStringProp(errorObj, 'message') || '');
  const hint =
    "עמודה public.nexus_users.last_seen_at לא קיימת בבסיס הנתונים.\n" +
    "כדי לתקן: הרץ Prisma migrations על אותו DB שמוגדר ב-DATABASE_URL/DIRECT_URL (למשל prisma/migrations/20260202001000_nexus_user_presence),\n" +
    "ואז ריסטארט ל-dev server.";
  throw new Error(`[DB][nexus_users][${params.phase}] ${hint} (code=${code || 'n/a'} message=${raw})`);
}

async function ensureProfileRow(params: {
  organizationId: string;
  clerkUserId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
  isSuperAdmin: boolean;
}) {
  const isNonProd = process.env.NODE_ENV !== 'production';

  type ProfileRow = NonNullable<Awaited<ReturnType<typeof prisma.profile.findFirst>>>;
  type ProfileCreateData = Parameters<typeof prisma.profile.create>[0]['data'];

  let existing: ProfileRow | null = null;
  try {
    existing = await prisma.profile.findFirst({
      where: { organizationId: params.organizationId, clerkUserId: params.clerkUserId },
    });
  } catch (error: unknown) {
    if (isNonProd && isPrismaMissingRelationError(error)) {
      throwMissingProfilesTableDevError({ phase: 'select', error });
    }
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to load profile');
  }

  if (existing?.id) {
    // Best-effort: backfill role and avatar if missing.
    const needsRoleBackfill = params.role && !existing.role;
    const needsAvatarBackfill = params.avatarUrl && !existing.avatarUrl;
    if (needsRoleBackfill || needsAvatarBackfill) {
      try {
        const backfillData: Record<string, unknown> = { updatedAt: new Date() };
        if (needsRoleBackfill) backfillData.role = params.role;
        if (needsAvatarBackfill) backfillData.avatarUrl = params.avatarUrl;
        await prisma.profile.updateMany({
          where: { id: existing.id, organizationId: params.organizationId, clerkUserId: params.clerkUserId },
          data: backfillData,
        });
        if (needsAvatarBackfill) existing = { ...existing, avatarUrl: params.avatarUrl };
      } catch (error: unknown) {
        if (isNonProd && isPrismaMissingRelationError(error)) {
          throwMissingProfilesTableDevError({ phase: 'update', error });
        }
        throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to update profile');
      }
    }
    return existing;
  }

  const insertRow: ProfileCreateData = {
    organizationId: params.organizationId,
    clerkUserId: params.clerkUserId,
    email: params.email,
    fullName: params.fullName,
    role: params.role,
    avatarUrl: params.avatarUrl,
    notificationPreferences: {},
    twoFactorEnabled: false,
    uiPreferences: { profileCompleted: false },
    socialProfile: {},
    billingInfo: {},
    updatedAt: new Date(),
  };

  try {
    return await prisma.profile.create({ data: insertRow });
  } catch (error: unknown) {
    if (isNonProd && isPrismaMissingRelationError(error)) {
      throwMissingProfilesTableDevError({ phase: 'insert', error });
    }

    // Concurrency-safe: if another request created the profile row first, re-fetch and return it.
    const errorObj = asObject(error);
    const code = String(getStringProp(errorObj, 'code') || '');
    if (code === 'P2002') {
      const existingAfter = await prisma.profile.findFirst({
        where: { organizationId: params.organizationId, clerkUserId: params.clerkUserId },
      });
      if (existingAfter?.id) return existingAfter;
    }

    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to create profile');
  }
}

type NexusUserRow = NonNullable<Awaited<ReturnType<typeof prisma.nexusUser.findFirst>>>;

async function findNexusUserByEmail(params: {
  email: string;
  organizationId?: string | null;
}): Promise<NexusUserRow | { id: string; email: string; organization_id: string | null } | null> {
  if (!params.organizationId) {
    const global = await findUserGlobalByEmail(params.email);
    if (!global) return null;
    return {
      id: global.id,
      email: global.email,
      organization_id: global.organizationId,
    };
  }

  const isNonProd = process.env.NODE_ENV !== 'production';
  try {
    const rows = await prisma.nexusUser.findMany({
      where: {
        email: params.email,
        organizationId: params.organizationId,
      },
      take: 2,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (rows.length > 1) {
      console.warn('[nexus_users] duplicate rows for email', {
        organizationId: params.organizationId ?? null,
        ids: rows.map((r) => r?.id).filter(Boolean),
      });
    }

    return rows[0] ?? null;
  } catch (error: unknown) {
    if (isNonProd) {
      if (isPrismaMissingColumnError(error)) {
        throwMissingNexusUsersColumnDevError({ phase: 'select', error });
      }
      if (isPrismaMissingRelationError(error)) {
        throwMissingNexusUsersTableDevError({ phase: 'select', error });
      }
    }
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to load nexus user');
  }
}

async function ensureNexusUserRow(params: {
  organizationId?: string | null;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
}) {
  const existing = await findNexusUserByEmail({ email: params.email, organizationId: params.organizationId });
  if (existing?.id) {
    const existingObj = asObject(existing) ?? {};
    const currentRole = typeof existingObj.role === 'string' ? existingObj.role : '';
    const currentAvatar = typeof existingObj.avatar === 'string' ? existingObj.avatar : '';

    // Correct role: if user was defaulted to 'עובד' but should have a management role
    const needsRoleCorrection = params.role && params.role !== 'עובד' && currentRole === 'עובד';
    const needsAvatarBackfill = params.avatarUrl && !currentAvatar;

    if (needsRoleCorrection || needsAvatarBackfill) {
      try {
        const updateData: Record<string, unknown> = {};
        if (needsRoleCorrection) updateData.role = params.role;
        if (needsAvatarBackfill) updateData.avatar = params.avatarUrl;
        await prisma.nexusUser.updateMany({
          where: { id: String(existing.id) },
          data: updateData,
        });
      } catch {
        // best-effort correction
      }
    }
    return existing;
  }

  const isNonProd = process.env.NODE_ENV !== 'production';

  type NexusUserCreateData = Parameters<typeof prisma.nexusUser.create>[0]['data'];

  const insertRow: NexusUserCreateData = {
    name: params.name,
    role: params.role || 'עובד',
    avatar: params.avatarUrl || null,
    online: true,
    capacity: 0,
    email: params.email,
    isSuperAdmin: params.isSuperAdmin,
    ...(params.organizationId ? { organizationId: params.organizationId } : {}),
  };

  // Prisma Client might be outdated locally; set lastSeenAt without relying on generated types.
  (insertRow as Record<string, unknown>)['lastSeenAt'] = new Date();

  try {
    return await prisma.nexusUser.create({ data: insertRow });
  } catch (error: unknown) {
    if (isNonProd) {
      if (isPrismaMissingColumnError(error)) {
        throwMissingNexusUsersColumnDevError({ phase: 'insert', error });
      }
      if (isPrismaMissingRelationError(error)) {
        throwMissingNexusUsersTableDevError({ phase: 'insert', error });
      }
    }

    const errorObj = asObject(error);
    const code = String(getStringProp(errorObj, 'code') || '');
    if (code === 'P2002') {
      const existingAfter = await findNexusUserByEmail({ email: params.email, organizationId: params.organizationId });
      if (existingAfter?.id) return existingAfter;
    }

    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to create nexus user');
  }
}

export async function resolveWorkspaceCurrentUserForUi(orgSlug: string) {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  return resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);
}

export const resolveWorkspaceCurrentUserForUiWithWorkspaceId = cache(async function resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspaceId: string) {
  const clerk = await currentUser();
  const clerkUserId = clerk?.id || null;
  if (!clerkUserId) {
    throw new Error('Unauthorized');
  }

  const email = clerk?.primaryEmailAddress?.emailAddress ?? null;
  if (!email) {
    throw new Error('User email not found');
  }

  const clerkRole = normalizeRoleFromClerk(clerk);
  const name = clerk?.fullName ?? clerk?.username ?? email.split('@')[0] ?? 'User';
  const avatarUrl = clerk?.imageUrl ?? null;
  const publicMetadataObj = asObject(asObject(clerk)?.publicMetadata);
  const isSuperAdmin = Boolean(publicMetadataObj?.isSuperAdmin);

  // Phase A: Run role check + profile ensure in parallel (both independent).
  // ensureProfileRow uses clerkRole (not the corrected one), so it can start immediately.
  // The role check determines nexusDisplayRole for ensureNexusUserRow.
  const roleCheckPromise = clerkRole === 'עובד'
    ? prisma.profile.findFirst({
        where: { organizationId: workspaceId, clerkUserId },
        select: { role: true },
      })
    : Promise.resolve(null);

  const [existingProfile, profileRow] = await Promise.all([
    roleCheckPromise,
    ensureProfileRow({
      organizationId: workspaceId,
      clerkUserId,
      email,
      fullName: clerk?.fullName ?? null,
      avatarUrl,
      role: clerkRole,
      isSuperAdmin,
    }),
  ]);

  // Org owners/super_admins should display as 'מנכ״ל', not the default 'עובד'.
  let nexusDisplayRole = clerkRole;
  const systemRole = existingProfile?.role || '';
  if (clerkRole === 'עובד' && (systemRole === 'owner' || systemRole === 'super_admin')) {
    nexusDisplayRole = 'מנכ״ל';
  }

  // Phase B: ensureNexusUserRow needs the corrected nexusDisplayRole
  const nexusUser = await ensureNexusUserRow({
    organizationId: workspaceId,
    email: String(email).trim().toLowerCase(),
    name,
    role: nexusDisplayRole,
    avatarUrl,
    isSuperAdmin,
  });

  const profileObj = asObject(profileRow) ?? {};
  const nexusObj = asObject(nexusUser) ?? {};
  const phoneValue = profileObj['phone'];
  const resolvedPhone = phoneValue != null ? String(phoneValue) : undefined;
  // Avatar priority: profile (custom upload) > nexusUser > Clerk imageUrl
  const profileAvatarValue = profileObj['avatarUrl'];
  const nexusAvatarValue = nexusObj['avatar'];
  const avatarCandidate =
    (typeof profileAvatarValue === 'string' && profileAvatarValue ? profileAvatarValue : '') ||
    (typeof nexusAvatarValue === 'string' && nexusAvatarValue ? nexusAvatarValue : '') ||
    String(avatarUrl || '');
  const ttlSeconds = 60 * 60;
  // Only call storage signing for sb:// refs; skip for external URLs and empty strings
  const needsSigning = avatarCandidate && avatarCandidate.startsWith('sb://');
  const signedAvatar = needsSigning
    ? await resolveStorageUrlMaybeServiceRole(avatarCandidate, ttlSeconds, { organizationId: workspaceId })
    : avatarCandidate || null;
  const resolvedAvatar = signedAvatar ?? (needsSigning ? String(avatarUrl || '') : avatarCandidate);
  const capacityValue = nexusObj['capacity'];
  const capacity = Number(capacityValue ?? 0) || 0;
  const nexusEmail = typeof nexusObj['email'] === 'string' ? String(nexusObj['email']) : String(email);
  const nexusIsSuperAdmin = Boolean(nexusObj['is_super_admin'] ?? nexusObj['isSuperAdmin'] ?? isSuperAdmin);

  const nexusId = String(nexusObj['id'] ?? '');
  const profileId = String(profileObj['id'] ?? '');
  const nameFromDb = String(nexusObj['name'] ?? '');
  const roleFromDb = String(nexusObj['role'] ?? '');
  // Use the corrected nexus role if the DB still has the old default
  const finalRole = (roleFromDb === 'עובד' && nexusDisplayRole !== 'עובד') ? nexusDisplayRole : (roleFromDb || clerkRole || 'עובד');

  return {
    id: nexusId || '',
    profileId: profileId || '',
    name: nameFromDb || name,
    role: finalRole,
    avatar: resolvedAvatar,
    online: true,
    capacity,
    email: nexusEmail,
    ...(resolvedPhone !== undefined ? { phone: resolvedPhone } : {}),
    isSuperAdmin: nexusIsSuperAdmin,
    organizationId: workspaceId,
    tenantId: workspaceId,
  };
});

export async function resolveWorkspaceCurrentUserForApi(orgHeaderValue: string) {
  const workspace = await requireWorkspaceAccessByOrgSlugApi(orgHeaderValue);

  const clerk = await currentUser();
  const clerkUserId = clerk?.id || null;
  if (!clerkUserId) {
    throw new Error('Unauthorized');
  }

  const email = clerk?.primaryEmailAddress?.emailAddress ?? null;
  if (!email) {
    throw new Error('User email not found');
  }

  const clerkRole = normalizeRoleFromClerk(clerk);
  const name = clerk?.fullName ?? clerk?.username ?? email.split('@')[0] ?? 'User';
  const avatarUrl = clerk?.imageUrl ?? null;
  const publicMetadataObj = asObject(asObject(clerk)?.publicMetadata);
  const isSuperAdmin = Boolean(publicMetadataObj?.isSuperAdmin);

  // Org owners/super_admins should display as 'מנכ״ל', not the default 'עובד'.
  let nexusDisplayRole = clerkRole;
  if (clerkRole === 'עובד') {
    const existingProfile = await prisma.profile.findFirst({
      where: { organizationId: workspace.id, clerkUserId },
      select: { role: true },
    });
    const systemRole = existingProfile?.role || '';
    if (systemRole === 'owner' || systemRole === 'super_admin') {
      nexusDisplayRole = 'מנכ״ל';
    }
  }

  // Run profile and nexus user creation in parallel — they are independent
  const [, nexusUser] = await Promise.all([
    ensureProfileRow({
      organizationId: workspace.id,
      clerkUserId,
      email,
      fullName: clerk?.fullName ?? null,
      avatarUrl,
      role: clerkRole,
      isSuperAdmin,
    }),
    ensureNexusUserRow({
      organizationId: workspace.id,
      email: String(email).trim().toLowerCase(),
      name,
      role: nexusDisplayRole,
      avatarUrl,
      isSuperAdmin,
    }),
  ]);

  return {
    user: nexusUser,
    workspace,
    clerkUser: {
      id: clerkUserId,
      email,
      firstName: clerk?.firstName ?? null,
      lastName: clerk?.lastName ?? null,
      role: nexusDisplayRole,
      isSuperAdmin,
    },
  };
}

/**
 * Lightweight workspace + user resolution for read-only list operations (e.g. listNexusTasks).
 * Skips ensureProfileRow / ensureNexusUserRow upserts — saving 2-4 DB round-trips per request.
 * The upserts are handled by resolveWorkspaceCurrentUserForUi / resolveWorkspaceCurrentUserForApi
 * on other code paths that run at least once per session (layout shell, mutations).
 *
 * Returns empty dbUserId when the nexus user row doesn't exist yet (first-ever request race).
 * Callers must handle dbUserId === '' gracefully (e.g. return empty list for non-managers).
 */
export async function resolveWorkspaceForTaskListApi(orgSlug: string): Promise<{
  workspace: Awaited<ReturnType<typeof requireWorkspaceAccessByOrgSlugApi>>;
  dbUserId: string;
  isSuperAdmin: boolean;
}> {
  const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
  const clerk = await currentUser();
  if (!clerk?.id) throw new Error('Unauthorized');

  const email = (clerk.primaryEmailAddress?.emailAddress ?? '').trim().toLowerCase();
  if (!email) throw new Error('User email not found');

  const publicMetadataObj = asObject(asObject(clerk)?.publicMetadata);
  const isSuperAdmin = Boolean(publicMetadataObj?.isSuperAdmin);

  // Single lightweight read — no upserts
  const nexusUser = await prisma.nexusUser.findFirst({
    where: { organizationId: workspace.id, email },
    select: { id: true },
  });

  return { workspace, dbUserId: String(nexusUser?.id ?? ''), isSuperAdmin };
}
