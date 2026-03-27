import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { enterTenantIsolationContext, withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { ALLOW_SCHEMA_FALLBACKS, reportSchemaFallback } from '@/lib/server/schema-fallbacks';
import {
  getErrorMessage,
  getErrorStatus,
  redactId,
  setErrorStatus,
} from '@/lib/server/workspace-access/utils';
import { getCurrentSocialUser as getCurrentSocialUserFromActor, resolveWorkspaceActorUi } from '@/lib/server/workspace-access/actor';
import {
  requireWorkspaceAccessByOrgSlugApiCached,
  requireWorkspaceIdByOrgSlugApiCached,
  requireWorkspaceAccessByOrgSlugCached,
} from '@/lib/server/workspace-access/access';
import {
  getOrganizationEntitlements as getOrganizationEntitlementsInternal,
  getOrganizationPackageEntitlements as getOrganizationPackageEntitlementsInternal,
  getPackageModules as getPackageModulesInternal,
  inferOrganizationPackageType as inferOrganizationPackageTypeInternal,
} from '@/lib/server/workspace-access/entitlements';

export type PackageType = import('@/lib/billing/pricing').PackageType;

export type WorkspaceInfo = {
  id: string;
  slug?: string | null;
  name: string;
  logo?: string | null;
  seatsAllowed: number | null;
  isShabbatProtected: boolean;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  trialEndDate: Date | null;
  entitlements: Record<OSModuleKey, boolean>;
  isSuperAdmin?: boolean;
};

export type WorkspaceInfoWithPackage = WorkspaceInfo & {
  packageType: PackageType;
};

export type WorkspaceEntitlements = Record<OSModuleKey, boolean>;

export type LastLocation = {
  orgSlug: string | null;
  module: OSModuleKey | null;
};

export type OrganizationModuleFlags = {
  has_nexus: boolean | null;
  has_system: boolean | null;
  has_social: boolean | null;
  has_finance: boolean | null;
  has_client: boolean | null;
  has_operations: boolean | null;
};

export function getPackageModules(packageType: PackageType): OSModuleKey[] {
  const modules = getPackageModulesInternal(packageType);
  if (modules && Array.isArray(modules) && modules.length) {
    return modules;
  }
  // Backwards compatible fail-safe.
  if (packageType === 'the_closer') return ['system', 'nexus'];
  if (packageType === 'the_authority') return ['social', 'nexus'];
  if (packageType === 'the_mentor') return ['nexus', 'system', 'social', 'client', 'finance', 'operations'];
  return ['nexus'];
}

export function inferOrganizationPackageType(flags: OrganizationModuleFlags): PackageType {
  // Heuristic mapping based on enabled modules.
  // Prefer the explicit all-inclusive package when the org has everything enabled.
  return inferOrganizationPackageTypeInternal(flags);
}

export async function getOrganizationPackageEntitlements(
  organizationId: string,
  socialUserId?: string,
  orgSlug?: string,
  preloadedFlags?: OrganizationModuleFlags
): Promise<{ packageType: PackageType; entitlements: WorkspaceEntitlements }> {
  // If socialUserId is provided, intersect with user's allowed modules.
  // Owners and Super Admins should not see locked modules in the UI.
  return await getOrganizationPackageEntitlementsInternal(organizationId, socialUserId, orgSlug, preloadedFlags);
}

export async function requireClerkUserId(): Promise<string> {
  try {
    const clerkUserId = String((await getCurrentUserId()) || '').trim();
    
    if (!clerkUserId) {
      redirect('/login');
    }
    
    return clerkUserId;
  } catch (error) {
    console.error('[requireClerkUserId] Error in getCurrentUserId:', error);
    throw error;
  }
}

export async function loadCurrentUserLastLocation(): Promise<LastLocation> {
  const clerkUserId = String((await getCurrentUserId()) || '').trim();
  if (!clerkUserId) {
    return { orgSlug: null, module: null };
  }

  try {
    const data = await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'workspace_last_location_load_unscoped',
        source: 'workspace_last_location_load',
        organizationId: '',
        tenantId: '',
      },
      async () =>
        await prisma.organizationUser.findUnique(
          withPrismaTenantIsolationOverride(
            {
              where: { clerk_user_id: clerkUserId },
              select: { last_location_org: true, last_module: true },
            },
            {
              source: 'workspace_last_location_load',
              organizationId: '',
              suppressReporting: true,
              reason: 'workspace_last_location_load_by_clerk_user_id',
            }
          )
        )
    );

    return {
      orgSlug: data?.last_location_org ?? null,
      module: (data?.last_module as OSModuleKey | null) ?? null,
    };
  } catch (error: unknown) {
    const rawMessage = String(getErrorMessage(error) || '');
    const message = rawMessage.toLowerCase();
    const isMissingRelation = message.includes('does not exist') || message.includes('relation');
    if (isMissingRelation) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] organization_user last_location missing table (${rawMessage || 'missing relation'})`);
      }

      reportSchemaFallback({
        source: 'lib/server/workspace.loadCurrentUserLastLocation',
        reason: 'organization_user last_location schema mismatch (fallback to null location)',
        error,
        extras: { clerkUserId: redactId(clerkUserId) },
      });
      return { orgSlug: null, module: null };
    }
    if (message.includes('permission denied')) {
      return { orgSlug: null, module: null };
    }
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to load last location');
  }
}

const PERSIST_LOCATION_THROTTLE_MS = 60 * 1000; // 60 seconds

declare global {
  var __MISRAD_LOCATION_PERSIST_LAST__: Map<string, number> | undefined;
}

function shouldSkipLocationPersist(clerkUserId: string, orgSlug: string, module: string | null | undefined): boolean {
  if (!globalThis.__MISRAD_LOCATION_PERSIST_LAST__) {
    globalThis.__MISRAD_LOCATION_PERSIST_LAST__ = new Map();
  }
  const map = globalThis.__MISRAD_LOCATION_PERSIST_LAST__;
  const key = `${clerkUserId}:${orgSlug}:${module ?? ''}`;
  const now = Date.now();
  const last = map.get(key);
  if (last !== undefined && now - last < PERSIST_LOCATION_THROTTLE_MS) return true;
  map.set(key, now);
  if (map.size > 1000) {
    const oldest = Array.from(map.entries()).sort((a, b) => a[1] - b[1]).slice(0, 200);
    for (const [k] of oldest) map.delete(k);
  }
  return false;
}

export async function persistCurrentUserLastLocation({
  orgSlug,
  module,
}: {
  orgSlug: string;
  module?: OSModuleKey | null;
}) {
  const clerkUserId = String((await getCurrentUserId()) || '').trim();
  if (!clerkUserId) {
    return;
  }

  if (shouldSkipLocationPersist(clerkUserId, orgSlug, module)) {
    return;
  }

  try {
    type OrganizationUserUpdateData = Parameters<typeof prisma.organizationUser.update>[0]['data'];
    const update: OrganizationUserUpdateData = {
      updated_at: new Date(),
      last_location_org: orgSlug,
      ...(module ? { last_module: module } : {}),
    };

    await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'workspace_last_location_persist_unscoped',
        source: 'workspace_last_location_persist',
        organizationId: '',
        tenantId: '',
      },
      async () =>
        await prisma.organizationUser.update(
          withPrismaTenantIsolationOverride(
            {
              where: { clerk_user_id: clerkUserId },
              data: update,
            },
            {
              source: 'workspace_last_location_persist',
              organizationId: '',
              suppressReporting: true,
              reason: 'workspace_last_location_persist_by_clerk_user_id',
            }
          )
        )
    );
  } catch (error: unknown) {
    const rawMessage = String(getErrorMessage(error) || '');
    const message = rawMessage.toLowerCase();
    if (
      message.includes('permission denied') ||
      message.includes('record to update not found') ||
      message.includes('p2025')
    ) {
      return;
    }
    if (message.includes('does not exist') || message.includes('relation')) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] organization_user last_location missing table (${rawMessage || 'missing relation'})`);
      }

      reportSchemaFallback({
        source: 'lib/server/workspace.persistCurrentUserLastLocation',
        reason: 'organization_user last_location schema mismatch (skip persist)',
        error,
        extras: { clerkUserId: redactId(clerkUserId), orgSlug },
      });
      return;
    }
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to persist last location');
  }
}

export async function requireCurrentOrganizationId(): Promise<string> {
  const clerkUserId = await requireClerkUserId();
  let socialUser: { id: string; organization_id: string | null; role?: string | null } | null = null;
  try {
    socialUser = await getCurrentSocialUserFromActor(clerkUserId);
  } catch (e: unknown) {
    const msg = String(getErrorMessage(e) || '').toLowerCase();
    const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
    const e2eOrgSlug = String(process.env.E2E_ORG_SLUG || '').trim();
    if (isE2E && e2eOrgSlug) {
      return e2eOrgSlug;
    }
    throw e;
  }
  const organizationId = socialUser?.organization_id;
  if (organizationId) {
    return String(organizationId);
  }

  // Fallback: if the user record exists but doesn't have organization_id yet,
  // try to resolve the org by ownership.
  if (socialUser?.id) {
    try {
      const org = await prisma.organization.findFirst({
        where: { owner_id: socialUser.id },
        select: { id: true },
      });
      if (org?.id) {
        return String(org.id);
      }
    } catch (error: unknown) {
      const rawMessage = String(getErrorMessage(error) || '');
      const message = rawMessage.toLowerCase();
      if (!ALLOW_SCHEMA_FALLBACKS && (message.includes('does not exist') || message.includes('relation'))) {
        throw new Error(`[SchemaMismatch] organizations missing table (${rawMessage || 'missing relation'})`);
      }

      if (ALLOW_SCHEMA_FALLBACKS && (message.includes('does not exist') || message.includes('relation'))) {
        reportSchemaFallback({
          source: 'lib/server/workspace.requireCurrentOrganizationId',
          reason: 'organizations lookup by owner_id schema mismatch (fallback to redirect/login)',
          error,
          extras: { clerkUserId: redactId(clerkUserId), socialUserId: redactId(socialUser.id) },
        });
      }
      console.error('[workspace-access] failed to resolve organization by owner_id', {
        clerkUserId: redactId(clerkUserId),
        socialUserId: redactId(socialUser.id),
        message: getErrorMessage(error),
      });
    }
  }
  redirect('/login');
}

export async function getOrganizationEntitlements(
  organizationId: string,
  socialUserId?: string,
  orgSlug?: string,
  preloadedFlags?: OrganizationModuleFlags
): Promise<WorkspaceEntitlements> {
  return await getOrganizationEntitlementsInternal(organizationId, socialUserId, orgSlug, preloadedFlags);
}

export function getFirstAllowedModule(entitlements: WorkspaceEntitlements): OSModuleKey | null {
  const order: OSModuleKey[] = ['nexus', 'system', 'operations', 'social', 'finance', 'client'];
  for (const key of order) {
    if (entitlements[key]) return key;
  }
  return null;
}

export async function requireWorkspaceAccessByOrgSlug(orgSlug: string): Promise<WorkspaceInfo> {
  try {
    const clerkUserId = await requireClerkUserId();
    const workspace = await requireWorkspaceAccessByOrgSlugCached(clerkUserId, String(orgSlug || ''));
    enterTenantIsolationContext({ source: 'workspace_access_ui', organizationId: workspace.id });
    return workspace;
  } catch (e: unknown) {
    const status = getErrorStatus(e);
    
    if (status === 401) {
      redirect('/login');
    }
    if (status === 404) {
      notFound();
    }
    if (status === 503) {
      redirect('/maintenance');
    }
    // Do not bounce users to the public homepage on access problems — keep them in-app.
    if (status === 403) {
      redirect(`/w/${encodeURIComponent(orgSlug)}/no-access`);
    }
    redirect('/workspaces');
  }
}

export async function requireWorkspaceAccessByOrgSlugUi(orgSlug: string): Promise<WorkspaceInfoWithPackage> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  // Entitlements are already user-scoped from the cached access function.
  // Infer packageType from the org-level flags (entitlements) to avoid redundant DB calls.
  const packageType = inferOrganizationPackageTypeInternal({
    has_nexus: workspace.entitlements.nexus,
    has_system: workspace.entitlements.system,
    has_social: workspace.entitlements.social,
    has_finance: workspace.entitlements.finance,
    has_client: workspace.entitlements.client,
    has_operations: workspace.entitlements.operations,
  });

  return {
    ...workspace,
    packageType,
  };
}

export async function requireWorkspaceAccessByOrgSlugApi(orgSlug: string): Promise<WorkspaceInfo> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    throw setErrorStatus(new Error('Unauthorized'), 401);
  }
  const workspace = await requireWorkspaceAccessByOrgSlugApiCached(String(clerkUserId), String(orgSlug || ''));
  enterTenantIsolationContext({ source: 'workspace_access_api', organizationId: workspace.id });
  return workspace;
}

export async function requireWorkspaceIdByOrgSlugApi(orgSlug: string): Promise<{ id: string }> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    throw setErrorStatus(new Error('Unauthorized'), 401);
  }
  const workspace = await requireWorkspaceIdByOrgSlugApiCached(String(clerkUserId), String(orgSlug || ''));
  enterTenantIsolationContext({ source: 'workspace_access_api_light', organizationId: workspace.id });
  return workspace;
}

export async function enforceModuleAccessOrRedirect({
  orgSlug,
  module,
}: {
  orgSlug: string;
  module: OSModuleKey;
}) {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  // Fast path: module is allowed by entitlements — no extra I/O needed
  if (workspace.entitlements[module]) {
    return workspace;
  }

  const bypassEntitlements = isBypassModuleEntitlementsEnabled();
  if (bypassEntitlements) {
    assertNoProdEntitlementsBypass('enforceModuleAccessOrRedirect');
    return workspace;
  }

  // Slow path: module not in entitlements — check if user is super admin
  // Use isSuperAdmin from workspace if available (already resolved during access check)
  if (workspace.isSuperAdmin) {
    return workspace;
  }

  // Fallback: resolve super admin status if not preloaded (should not happen with cached function)
  const clerkUserId = await requireClerkUserId();
  let isSuperAdmin = false;
  try {
    ({ isSuperAdmin } = await resolveWorkspaceActorUi(clerkUserId));
  } catch (e: unknown) {
    const status = getErrorStatus(e);
    if (status === 401) {
      redirect('/login');
    }
    if (status === 404) {
      notFound();
    }
    if (status === 503) {
      redirect('/maintenance');
    }
    redirect('/');
  }

  if (isSuperAdmin) {
    return workspace;
  }

  redirect(`/w/${encodeURIComponent(orgSlug)}/no-access?module=${encodeURIComponent(module)}`);
}

export function isE2eTestingEnv(): boolean {
  const raw = String(process.env.IS_E2E_TESTING || '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

export function isBypassModuleEntitlementsEnabled(): boolean {
  const raw = String(process.env.E2E_BYPASS_MODULE_ENTITLEMENTS || '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

export function assertNoProdEntitlementsBypass(context: string): void {
  if (!isBypassModuleEntitlementsEnabled()) return;
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;
  if (isE2eTestingEnv()) return;
  throw new Error(
    `[Security Risk] E2E_BYPASS_MODULE_ENTITLEMENTS cannot be enabled in production. Context: ${String(context || '')}`
  );
}
