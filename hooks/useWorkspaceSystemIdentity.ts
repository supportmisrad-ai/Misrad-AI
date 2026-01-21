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

function buildClerkFullName(clerkUser: any): string {
  const full = safeString(clerkUser?.fullName);
  if (full) return full;
  const first = safeString(clerkUser?.firstName);
  const last = safeString(clerkUser?.lastName);
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  const username = safeString(clerkUser?.username);
  if (username) return username;
  const email = safeString(clerkUser?.primaryEmailAddress?.emailAddress);
  if (email.includes('@')) return email.split('@')[0] || 'משתמש';
  return email || 'משתמש';
}

function buildClerkRole(clerkUser: any): string | null {
  const roleFromClerk =
    (clerkUser as any)?.publicMetadata?.role ??
    (clerkUser as any)?.privateMetadata?.role ??
    (clerkUser as any)?.unsafeMetadata?.role ??
    null;

  const normalized = typeof roleFromClerk === 'string' ? roleFromClerk : (roleFromClerk as any)?.role ?? null;
  return typeof normalized === 'string' && normalized.trim() ? normalized.trim() : null;
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
    const clerkAvatar = safeString((clerkUser as any)?.imageUrl);

    const name = profileName || (isClerkLoaded ? clerkName : '') || fallbackName || 'משתמש';
    const role = (profileRole || (isClerkLoaded ? clerkRole : null) || fallbackRole || null) as string | null;
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
