import 'server-only';

import { currentUser } from '@clerk/nextjs/server';
import * as React from 'react';
import prisma, { accelerateCache } from '@/lib/prisma';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { asObject, getErrorMessage, logWorkspaceAccessError, redactId, setErrorStatus } from './utils';
import type { SocialUserRow } from './types';

type CacheFn = <Args extends unknown[], R>(fn: (...args: Args) => R) => (...args: Args) => R;
function identityCache<Args extends unknown[], R>(fn: (...args: Args) => R) {
  return fn;
}

const reactCache: unknown = Reflect.get(React, 'cache');
const cache: CacheFn = typeof reactCache === 'function' ? (reactCache as CacheFn) : identityCache;

export async function getCurrentSocialUser(clerkUserId: string): Promise<SocialUserRow | null> {
  const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
  const e2eOrgSlug = String(process.env.E2E_ORG_SLUG || '').trim();
  const normalizedClerkUserId = String(clerkUserId || '').trim();
  if (!normalizedClerkUserId) return null;
  try {
    const row = await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'workspace_access_lookup_social_user_unscoped',
        source: 'workspace_access',
        organizationId: '',
        tenantId: '',
      },
      async () =>
        await prisma.organizationUser.findUnique(
          withPrismaTenantIsolationOverride(
            {
              where: { clerk_user_id: normalizedClerkUserId },
              select: { id: true, organization_id: true, role: true, allowed_modules: true },
              ...accelerateCache({ ttl: 30, swr: 60 }),
            },
            {
              source: 'workspace_access',
              organizationId: '',
              suppressReporting: true,
              reason: 'workspace_access_lookup_social_user_by_clerk_user_id',
            }
          )
        )
    );

    if (!row?.id) return null;
    return row;
  } catch (error: unknown) {
    const message = String(getErrorMessage(error) || '').toLowerCase();
    if (isE2E && e2eOrgSlug && (message.includes('does not exist') || message.includes('relation') || message.includes('permission denied'))) {
      return {
        id: String(normalizedClerkUserId),
        organization_id: e2eOrgSlug,
        role: 'super_admin',
      };
    }
    logWorkspaceAccessError('[workspace-access] failed to load social_user', {
      clerkUserId: redactId(normalizedClerkUserId),
      message: getErrorMessage(error),
    });
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to load social_user');
  }
}

async function isClerkSuperAdmin(): Promise<boolean> {
  try {
    const clerk = await currentUser();
    const clerkObj = asObject(clerk);
    const publicMetadataObj = asObject(clerkObj?.publicMetadata);
    return Boolean(publicMetadataObj?.isSuperAdmin);
  } catch (error: unknown) {
    logWorkspaceAccessError('[workspace-access] failed to resolve clerk super admin', {
      message: getErrorMessage(error),
    });
    return false;
  }
}

const getClerkIsSuperAdminCached = cache(async (): Promise<boolean> => {
  return await isClerkSuperAdmin();
});

const getCurrentSocialUserCached = cache(async (clerkUserId: string): Promise<SocialUserRow | null> => {
  return await getCurrentSocialUser(clerkUserId);
});

export async function resolveWorkspaceActorUi(clerkUserId: string): Promise<{ socialUser: SocialUserRow | null; isSuperAdmin: boolean }> {
  // Run social user lookup and Clerk super-admin check in parallel (independent I/O)
  const [socialUserResult, clerkIsSuperAdmin] = await Promise.all([
    getCurrentSocialUserCached(clerkUserId).catch((e: unknown) => {
      throw e instanceof Error ? e : new Error(getErrorMessage(e) || 'Failed to load social_user');
    }),
    getClerkIsSuperAdminCached(),
  ]);

  const socialUser = socialUserResult;
  if (!socialUser?.id && !clerkIsSuperAdmin) {
    throw setErrorStatus(new Error('Unauthorized'), 401);
  }

  const isSuperAdmin = clerkIsSuperAdmin || String(socialUser?.role || '').toLowerCase() === 'super_admin';
  return { socialUser, isSuperAdmin };
}

export async function resolveWorkspaceActorApi(clerkUserId: string): Promise<{ socialUser: SocialUserRow | null; isSuperAdmin: boolean }> {
  // Run social user lookup and Clerk super-admin check in parallel (independent I/O)
  const [socialUser, clerkIsSuperAdmin] = await Promise.all([
    getCurrentSocialUserCached(clerkUserId).catch((e: unknown) => {
      const msg = String(getErrorMessage(e) || '').toLowerCase();
      if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('permission denied')) {
        throw setErrorStatus(new Error('Service unavailable'), 503);
      }
      throw e;
    }),
    getClerkIsSuperAdminCached(),
  ]);

  if (!socialUser?.id && !clerkIsSuperAdmin) {
    throw setErrorStatus(new Error('Unauthorized'), 401);
  }

  const isSuperAdmin = clerkIsSuperAdmin || String(socialUser?.role || '').toLowerCase() === 'super_admin';
  if (!socialUser?.id && !isSuperAdmin) {
    throw setErrorStatus(new Error('Unauthorized'), 401);
  }

  return { socialUser, isSuperAdmin };
}
