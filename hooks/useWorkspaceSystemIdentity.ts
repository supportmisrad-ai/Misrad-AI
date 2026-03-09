'use client';

import { useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useWorkspaceProfileIdentity } from '@/hooks/useWorkspaceProfileIdentity';

export type WorkspaceSystemIdentity = {
  name: string;
  role: string | null;
  avatarUrl: string | null;
  needsProfileCompletion: boolean;
  profileCompleted: boolean;
};

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  const v = obj?.[key];
  return typeof v === 'string' ? v : null;
}

function buildClerkFullName(clerkUser: unknown): string {
  const clerkObj = asObject(clerkUser);
  const full = safeString(getStringProp(clerkObj, 'fullName'));
  if (full) return full;
  const first = safeString(getStringProp(clerkObj, 'firstName'));
  const last = safeString(getStringProp(clerkObj, 'lastName'));
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  const username = safeString(getStringProp(clerkObj, 'username'));
  if (username) return username;
  const primaryEmail = asObject(clerkObj?.primaryEmailAddress);
  const email = safeString(getStringProp(primaryEmail, 'emailAddress'));
  if (email.includes('@')) return email.split('@')[0] || 'משתמש';
  return email || 'משתמש';
}

function normalizeRoleValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  const obj = asObject(value);
  const role = getStringProp(obj, 'role');
  return role && role.trim() ? role.trim() : null;
}

function buildClerkRole(clerkUser: unknown): string | null {
  const clerkObj = asObject(clerkUser);
  const publicMetadata = asObject(clerkObj?.publicMetadata);
  const privateMetadata = asObject(clerkObj?.privateMetadata);
  const unsafeMetadata = asObject(clerkObj?.unsafeMetadata);

  const roleFromClerk = publicMetadata?.role ?? privateMetadata?.role ?? unsafeMetadata?.role ?? null;
  return normalizeRoleValue(roleFromClerk);
}

function hasMeaningfulIdentityValue(value: string | null | undefined): boolean {
  return Boolean(value && typeof value === 'string' && value.trim().length > 0);
}

export function useWorkspaceSystemIdentity(
  orgSlug: string | null | undefined,
  fallback?: { name?: string | null; role?: string | null; avatarUrl?: string | null }
): {
  identity: WorkspaceSystemIdentity | null;
  isLoading: boolean;
} {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { identity: profileIdentity, isLoading } = useWorkspaceProfileIdentity(orgSlug);

  const identity = useMemo<WorkspaceSystemIdentity | null>(() => {
    if (!orgSlug) return null;

    const profileName = safeString(profileIdentity?.name ?? '');
    const profileRole = safeString(profileIdentity?.role ?? '');
    const profileAvatar = safeString(profileIdentity?.avatarUrl ?? '');

    const fallbackName = safeString(fallback?.name ?? '');
    const fallbackRole = safeString(fallback?.role ?? '');
    const fallbackAvatar = safeString(fallback?.avatarUrl ?? '');

    const clerkName = buildClerkFullName(clerkUser);
    const clerkRole = buildClerkRole(clerkUser);
    const clerkAvatar = safeString(getStringProp(asObject(clerkUser), 'imageUrl'));

    const name = profileName || (isClerkLoaded ? clerkName : '') || fallbackName || 'משתמש';
    const role = profileRole || (isClerkLoaded ? clerkRole : null) || fallbackRole || null;
    const avatarUrl = profileAvatar || (isClerkLoaded ? clerkAvatar : '') || fallbackAvatar || null;

    const profileCompleted = profileIdentity ? Boolean(profileIdentity.profileCompleted) : true;

    const needsProfileCompletion =
      !profileCompleted ||
      !hasMeaningfulIdentityValue(profileIdentity?.name ?? null) ||
      !hasMeaningfulIdentityValue(profileIdentity?.avatarUrl ?? null) ||
      !hasMeaningfulIdentityValue(profileIdentity?.role ?? null);

    return {
      name,
      role,
      avatarUrl: avatarUrl || null,
      needsProfileCompletion,
      profileCompleted,
    };
  }, [clerkUser, fallback?.avatarUrl, fallback?.name, fallback?.role, isClerkLoaded, orgSlug, profileIdentity]);

  return { identity, isLoading };
}
