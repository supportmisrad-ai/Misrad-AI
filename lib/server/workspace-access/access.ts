import 'server-only';

import * as React from 'react';

import { decodeMaybeRepeatedly, decodeOnce, logWorkspaceAccessError, redactId, setErrorStatus } from './utils';
import type { WorkspaceInfo } from './types';
import { resolveWorkspaceActorApi, resolveWorkspaceActorUi } from './actor';
import { resolveOrganizationForWorkspaceAccessApi, resolveOrganizationForWorkspaceAccessUi } from './org-resolve';
import { checkWorkspaceMembership } from './membership';
import { enforceTrialExpirationBestEffort } from './trial';
import { getOrganizationEntitlements } from './entitlements';

const WORKSPACE_ACCESS_DEBUG =
  process.env.NODE_ENV === 'development' &&
  (String(process.env.WORKSPACE_ACCESS_DEBUG || '').toLowerCase() === 'true' ||
    String(process.env.WORKSPACE_ACCESS_DEBUG || '').toLowerCase() === '1');

type CacheFn = <Args extends unknown[], R>(fn: (...args: Args) => R) => (...args: Args) => R;
function identityCache<Args extends unknown[], R>(fn: (...args: Args) => R) {
  return fn;
}

const reactCache: unknown = Reflect.get(React, 'cache');
const cache: CacheFn = typeof reactCache === 'function' ? (reactCache as CacheFn) : identityCache;

export const requireWorkspaceAccessByOrgSlugCached = cache(async (clerkUserId: string, orgSlug: string): Promise<WorkspaceInfo> => {
  if (!orgSlug) {
    logWorkspaceAccessError('[workspace-access] missing orgSlug for workspace route', {
      clerkUserId: redactId(clerkUserId),
    });
    throw setErrorStatus(new Error('Missing workspace context'), 400);
  }

  const decodedOrgSlug = decodeMaybeRepeatedly(orgSlug);
  const decodedOnceOrgSlug = decodeOnce(orgSlug);

  // Phase 1: Actor + Org resolution are independent — run in parallel
  // (mirrors the API path pattern which was already parallelized)
  const [{ socialUser, isSuperAdmin }, org] = await Promise.all([
    resolveWorkspaceActorUi(clerkUserId),
    resolveOrganizationForWorkspaceAccessUi({
      orgSlug,
      decodedOrgSlug,
      decodedOnceOrgSlug,
      socialUser: null,
    }),
  ]);

  // Phase 2: Membership check (needs both actor + org)
  const membership = await checkWorkspaceMembership({ org, socialUser, isSuperAdmin });
  if (!membership.allowed) {
    if (WORKSPACE_ACCESS_DEBUG) {
      logWorkspaceAccessError('[workspace-access] forbidden -> redirect(/)', {
        orgSlug: redactId(orgSlug),
        clerkUserId: redactId(clerkUserId),
        organizationKey: redactId(decodedOrgSlug),
        org: {
          id: redactId(org.id),
          owner_id: redactId(org.owner_id),
        },
        actor: {
          socialUserId: redactId(socialUser?.id),
          socialUserOrgId: redactId(socialUser?.organization_id),
          isOwner: membership.isOwner,
          isPrimary: membership.isPrimary,
          isTeamMember: membership.isTeamMember,
          isSuperAdmin,
        },
      });
    }

    throw setErrorStatus(new Error('Forbidden'), 403);
  }

  // Check if organization trial has expired and redirect to trial-expired page
  if (!isSuperAdmin && org.subscription_status === 'expired') {
    const { redirect } = await import('next/navigation');
    redirect('/app/trial-expired');
  }

  // Fire-and-forget: trial enforcement is a side-effect for NEXT request, not current
  if (!isSuperAdmin && socialUser?.id) {
    enforceTrialExpirationBestEffort({
      organizationId: String(org.id),
      socialUserId: String(socialUser.id),
      now: new Date(),
    }).catch(() => undefined);
  }

  let entitlements = await getOrganizationEntitlements(
    String(org.id),
    isSuperAdmin ? undefined : socialUser?.id ?? undefined,
    decodedOrgSlug,
    org
  );

  if (isSuperAdmin) {
    entitlements = { nexus: true, system: true, social: true, finance: true, client: true, operations: true };
  }

  return {
    id: String(org.id),
    slug: org?.slug ?? null,
    name: org?.name ?? 'Workspace',
    logo: org?.logo ?? null,
    seatsAllowed: Number.isFinite(Number(org?.seats_allowed)) ? Number(org?.seats_allowed) : null,
    isShabbatProtected: org?.is_shabbat_protected === false ? false : true,
    entitlements,
  };
});

export const requireWorkspaceAccessByOrgSlugApiCached = cache(async (clerkUserId: string, orgSlug: string): Promise<WorkspaceInfo> => {
  const decodedOrgSlug = decodeMaybeRepeatedly(orgSlug);
  const decodedOnceOrgSlug = decodeOnce(orgSlug);

  if (WORKSPACE_ACCESS_DEBUG) {
    console.log('[workspace-access] requireWorkspaceAccessByOrgSlugApi', {
      originalOrgSlug: redactId(orgSlug),
      decodedOrgSlug: redactId(decodedOrgSlug),
      decodedOnceOrgSlug: redactId(decodedOnceOrgSlug),
      clerkUserId: redactId(clerkUserId),
    });
  }

  // Actor and org resolution are independent in API path — run in parallel
  const [{ socialUser, isSuperAdmin }, org] = await Promise.all([
    resolveWorkspaceActorApi(clerkUserId),
    resolveOrganizationForWorkspaceAccessApi({
      orgSlug,
      decodedOrgSlug,
      decodedOnceOrgSlug,
    }),
  ]);

  const membership = await checkWorkspaceMembership({ org, socialUser, isSuperAdmin });
  if (!membership.allowed) {
    throw setErrorStatus(new Error('Forbidden'), 403);
  }

  // Check if organization trial has expired (for API routes)
  if (!isSuperAdmin && org.subscription_status === 'expired') {
    throw setErrorStatus(new Error('Trial expired'), 402); // 402 Payment Required
  }

  // Fire-and-forget: trial enforcement is a side-effect for NEXT request, not current
  if (!isSuperAdmin && socialUser?.id) {
    enforceTrialExpirationBestEffort({
      organizationId: String(org.id),
      socialUserId: String(socialUser.id),
      now: new Date(),
    }).catch(() => undefined);
  }

  let entitlements = await getOrganizationEntitlements(org.id, isSuperAdmin ? undefined : socialUser?.id, orgSlug, org);

  if (isSuperAdmin) {
    entitlements = { nexus: true, system: true, social: true, finance: true, client: true, operations: true };
  }

  return {
    id: org.id,
    slug: org.slug ?? null,
    name: org.name ?? 'Workspace',
    logo: org.logo ?? null,
    seatsAllowed: Number.isFinite(Number(org.seats_allowed)) ? Number(org.seats_allowed) : null,
    isShabbatProtected: org?.is_shabbat_protected === false ? false : true,
    entitlements,
  };
});

export const requireWorkspaceIdByOrgSlugApiCached = cache(async (clerkUserId: string, orgSlug: string): Promise<{ id: string }> => {
  if (!orgSlug) {
    throw setErrorStatus(new Error('Missing workspace context'), 400);
  }

  const decodedOrgSlug = decodeMaybeRepeatedly(orgSlug);
  const decodedOnceOrgSlug = decodeOnce(orgSlug);

  // Actor and org resolution are independent — run in parallel
  const [{ socialUser, isSuperAdmin }, org] = await Promise.all([
    resolveWorkspaceActorApi(clerkUserId),
    resolveOrganizationForWorkspaceAccessApi({
      orgSlug,
      decodedOrgSlug,
      decodedOnceOrgSlug,
    }),
  ]);

  const membership = await checkWorkspaceMembership({ org, socialUser, isSuperAdmin });
  if (!membership.allowed) {
    throw setErrorStatus(new Error('Forbidden'), 403);
  }

  return { id: String(org.id) };
});
