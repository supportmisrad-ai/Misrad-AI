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

  const { socialUser, isSuperAdmin } = await resolveWorkspaceActorUi(clerkUserId);
  const org = await resolveOrganizationForWorkspaceAccessUi({
    orgSlug,
    decodedOrgSlug,
    decodedOnceOrgSlug,
    socialUser,
  });

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

  if (!isSuperAdmin && socialUser?.id) {
    await enforceTrialExpirationBestEffort({
      organizationId: String(org.id),
      socialUserId: String(socialUser.id),
      now: new Date(),
    });
  }

  const entitlements = await getOrganizationEntitlements(
    String(org.id),
    isSuperAdmin ? undefined : socialUser?.id ?? undefined,
    decodedOrgSlug,
    org
  );

  return {
    id: String(org.id),
    slug: org?.slug ?? null,
    name: org?.name ?? 'Workspace',
    logo: org?.logo ?? null,
    seatsAllowed: Number.isFinite(Number(org?.seats_allowed)) ? Number(org?.seats_allowed) : null,
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

  const { socialUser, isSuperAdmin } = await resolveWorkspaceActorApi(clerkUserId);
  const org = await resolveOrganizationForWorkspaceAccessApi({
    orgSlug,
    decodedOrgSlug,
    decodedOnceOrgSlug,
  });

  const membership = await checkWorkspaceMembership({ org, socialUser, isSuperAdmin });
  if (!membership.allowed) {
    throw setErrorStatus(new Error('Forbidden'), 403);
  }

  if (!isSuperAdmin && socialUser?.id) {
    await enforceTrialExpirationBestEffort({
      organizationId: String(org.id),
      socialUserId: String(socialUser.id),
      now: new Date(),
    });
  }

  const entitlements = await getOrganizationEntitlements(org.id, isSuperAdmin ? undefined : socialUser?.id, orgSlug, org);

  return {
    id: org.id,
    slug: org.slug ?? null,
    name: org.name ?? 'Workspace',
    logo: org.logo ?? null,
    seatsAllowed: Number.isFinite(Number(org.seats_allowed)) ? Number(org.seats_allowed) : null,
    entitlements,
  };
});
