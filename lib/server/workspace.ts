import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride } from '@/lib/prisma-tenant-guard';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';

export type PackageType = import('@/lib/billing/pricing').PackageType;

export type WorkspaceInfo = {
  id: string;
  slug?: string | null;
  name: string;
  logo?: string | null;
  seatsAllowed: number | null;
  entitlements: Record<OSModuleKey, boolean>;
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

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

function isUuidLike(value: string | null | undefined): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
}

function setErrorStatus(err: Error, status: number): Error {
  (err as Error & { status?: number }).status = status;
  return err;
}

function getErrorStatus(error: unknown): number | null {
  const obj = asObject(error);
  const s = obj?.status;
  return typeof s === 'number' && Number.isFinite(s) ? s : null;
}

function parseEnvCsv(value: string | undefined | null): string[] {
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function decodeMaybeRepeatedly(value: string, maxRounds = 3): string {
  let v = String(value || '');
  for (let i = 0; i < maxRounds; i++) {
    if (!v.includes('%')) return v;
    try {
      const next = decodeURIComponent(v);
      if (next === v) return v;
      v = next;
    } catch {
      return v;
    }
  }
  return v;
}

function decodeOnce(value: string): string {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

async function enforceTrialExpirationBestEffort(params: {
  organizationId: string;
  socialUserId: string;
  now: Date;
}): Promise<void> {
  try {
    const organizationId = String(params.organizationId || '').trim();
    const socialUserId = String(params.socialUserId || '').trim();
    const now = params.now instanceof Date ? params.now : new Date();

    if (!organizationId || !socialUserId || Number.isNaN(now.getTime())) return;

    const [member, org] = await Promise.all([
      prisma.social_team_members.findFirst({
        where: {
          organization_id: organizationId,
          user_id: socialUserId,
        },
        select: {
          subscription_status: true,
          trial_start_date: true,
          trial_days: true,
        },
      }),
      prisma.social_organizations.findUnique({
        where: { id: organizationId },
        select: {
          subscription_status: true,
          trial_start_date: true,
          trial_days: true,
        },
      }),
    ]);

    const updates: Promise<unknown>[] = [];

    if (member?.subscription_status === 'trial' && member?.trial_start_date) {
      const start = member.trial_start_date instanceof Date ? member.trial_start_date : new Date(String(member.trial_start_date));
      const days = Number.isFinite(Number(member.trial_days)) ? Number(member.trial_days) : DEFAULT_TRIAL_DAYS;
      if (!Number.isNaN(start.getTime()) && Number.isFinite(days) && days > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + Math.floor(days));
        if (now > end) {
          updates.push(
            prisma.social_team_members.updateMany({
              where: {
                organization_id: organizationId,
                user_id: socialUserId,
                subscription_status: 'trial',
              },
              data: {
                subscription_status: 'expired',
                updated_at: now,
              },
            })
          );
        }
      }
    }

    if (org?.subscription_status === 'trial' && org?.trial_start_date) {
      const start = org.trial_start_date instanceof Date ? org.trial_start_date : new Date(String(org.trial_start_date));
      const days = Number.isFinite(Number(org.trial_days)) ? Number(org.trial_days) : DEFAULT_TRIAL_DAYS;
      if (!Number.isNaN(start.getTime()) && Number.isFinite(days) && days > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + Math.floor(days));
        if (now > end) {
          updates.push(
            prisma.social_organizations.updateMany({
              where: {
                id: organizationId,
                subscription_status: 'trial',
              },
              data: {
                subscription_status: 'expired',
                updated_at: now,
              },
            })
          );
        }
      }
    }

    if (updates.length) {
      await Promise.allSettled(updates);
    }
  } catch (e: unknown) {
    console.error('[workspace-access] enforceTrialExpirationBestEffort failed (ignored)', {
      message: getErrorMessage(e),
    });
  }
}

async function isClerkSuperAdmin(): Promise<boolean> {
  try {
    const clerk = await currentUser();
    const clerkObj = asObject(clerk);
    const publicMetadataObj = asObject(clerkObj?.publicMetadata);
    return Boolean(publicMetadataObj?.isSuperAdmin);
  } catch (error: unknown) {
    console.error('[workspace-access] failed to resolve clerk super admin', {
      message: getErrorMessage(error),
    });
    return false;
  }
}

function isInternalWorkspace(params: {
  organizationId?: string | null;
  orgSlug?: string | null;
}): boolean {
  const orgId = params.organizationId ? String(params.organizationId).trim() : '';
  const orgSlug = params.orgSlug ? String(params.orgSlug).trim() : '';

  const envIds = new Set([
    ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_ID),
    ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_IDS),
  ]);
  const envSlugs = new Set([
    ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_SLUG),
    ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_SLUGS),
  ]);

  if (orgId && envIds.has(orgId)) return true;
  if (orgSlug && envSlugs.has(orgSlug)) return true;
  return false;
}

async function applyLaunchScopeToEntitlements(
  entitlements: WorkspaceEntitlements,
  ctx?: { organizationId?: string | null; orgSlug?: string | null }
): Promise<WorkspaceEntitlements> {
  try {
    if (isInternalWorkspace({ organizationId: ctx?.organizationId ?? null, orgSlug: ctx?.orgSlug ?? null })) {
      return {
        nexus: true,
        system: true,
        social: true,
        finance: true,
        client: true,
        operations: true,
      };
    }

    const flags = await getSystemFeatureFlags();
    const scope = flags.launch_scope_modules;
    return {
      nexus: Boolean(entitlements.nexus && scope.nexus),
      system: Boolean(entitlements.system && scope.system),
      social: Boolean(entitlements.social && scope.social),
      finance: Boolean(entitlements.finance && scope.finance),
      client: Boolean(entitlements.client && scope.client),
      operations: Boolean(entitlements.operations && scope.operations),
    };
  } catch (error: unknown) {
    console.error('[workspace-access] failed to apply launch scope entitlements', {
      organizationId: ctx?.organizationId ?? null,
      orgSlug: ctx?.orgSlug ?? null,
      message: getErrorMessage(error),
    });
    return entitlements;
  }
}

function buildEntitlementsFromAllowedModules(allowed: Iterable<OSModuleKey>): WorkspaceEntitlements {
  const set = new Set<OSModuleKey>(allowed);
  return {
    nexus: set.has('nexus'),
    system: set.has('system'),
    social: set.has('social'),
    finance: set.has('finance'),
    client: set.has('client'),
    operations: set.has('operations'),
  };
}

export function getPackageModules(packageType: PackageType): OSModuleKey[] {
  const def = (BILLING_PACKAGES as Record<string, unknown>)[packageType];
  const defObj = asObject(def);
  const modules = defObj?.modules;
  if (modules && Array.isArray(modules)) {
    return modules as OSModuleKey[];
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
  if (
    flags.has_nexus &&
    flags.has_system &&
    flags.has_social &&
    flags.has_client &&
    flags.has_finance &&
    flags.has_operations
  ) {
    return 'the_empire';
  }

  if (flags.has_operations || flags.has_finance) return 'the_operator';
  if (flags.has_social || flags.has_client) return 'the_authority';
  return 'the_closer';
}

async function loadOrganizationModuleFlags(organizationId: string): Promise<OrganizationModuleFlags> {
  try {
    const org = await prisma.social_organizations.findUnique({
      where: { id: organizationId },
      select: {
        has_nexus: true,
        has_system: true,
        has_social: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
      },
    });

    if (!org) {
      const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
      if (isE2E) {
        return {
          has_nexus: true,
          has_system: true,
          has_social: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
        };
      }
      throw new Error('Organization not found');
    }

    return {
      has_nexus: org?.has_nexus ?? false,
      has_system: org?.has_system ?? false,
      has_social: org?.has_social ?? false,
      has_finance: org?.has_finance ?? false,
      has_client: org?.has_client ?? false,
      has_operations: org?.has_operations ?? false,
    };
  } catch (error: unknown) {
    const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
    const message = String(getErrorMessage(error) || '').toLowerCase();
    if (
      isE2E &&
      (message.includes('does not exist') || message.includes('relation') || message.includes('permission denied'))
    ) {
      return {
        has_nexus: true,
        has_system: true,
        has_social: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
      };
    }
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to load organization flags');
  }
}

export async function getOrganizationPackageEntitlements(
  organizationId: string,
  socialUserId?: string,
  orgSlug?: string,
  preloadedFlags?: OrganizationModuleFlags
): Promise<{ packageType: PackageType; entitlements: WorkspaceEntitlements }> {
  const flags = preloadedFlags || await loadOrganizationModuleFlags(organizationId);
  const packageType = inferOrganizationPackageType(flags);

  const orgEntitlements: WorkspaceEntitlements = {
    nexus: flags.has_nexus ?? false,
    system: flags.has_system ?? false,
    social: flags.has_social ?? false,
    finance: flags.has_finance ?? false,
    client: flags.has_client ?? false,
    operations: flags.has_operations ?? false,
  };

  // If socialUserId is provided, intersect with user's allowed modules.
  if (socialUserId) {
    const user = await prisma.social_users.findFirst({
      where: { id: socialUserId, organization_id: organizationId },
      select: { allowed_modules: true, role: true },
    });

    // Owners and Super Admins should not see locked modules in the UI.
    if (user?.role === 'owner' || user?.role === 'super_admin') {
      const entitlements = await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });

      return { packageType, entitlements };
    }

    if (user?.allowed_modules && Array.isArray(user.allowed_modules)) {
      const userModules = new Set(user.allowed_modules);
      const entitlements = await applyLaunchScopeToEntitlements(
        {
          nexus: orgEntitlements.nexus && userModules.has('nexus'),
          system: orgEntitlements.system && userModules.has('system'),
          social: orgEntitlements.social && userModules.has('social'),
          finance: orgEntitlements.finance && userModules.has('finance'),
          client: orgEntitlements.client && userModules.has('client'),
          operations: orgEntitlements.operations && userModules.has('operations'),
        },
        { organizationId, orgSlug }
      );

      return { packageType, entitlements };
    }
  }

  const entitlements = await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });

  return { packageType, entitlements };
}

export async function requireClerkUserId(): Promise<string> {
  const clerkUserId = String((await getCurrentUserId()) || '').trim();
  if (!clerkUserId) {
    redirect('/sign-in');
  }
  return clerkUserId;
}

export async function loadCurrentUserLastLocation(): Promise<LastLocation> {
  const clerkUserId = String((await getCurrentUserId()) || '').trim();
  if (!clerkUserId) {
    return { orgSlug: null, module: null };
  }

  try {
    const data = await prisma.social_users.findUnique(
      withPrismaTenantIsolationOverride(
        {
          where: { clerk_user_id: clerkUserId },
          select: { last_location_org: true, last_module: true },
        },
        {
          source: 'workspace_last_location_load',
          organizationId: '',
          suppressReporting: true,
        }
      )
    );

    return {
      orgSlug: data?.last_location_org ?? null,
      module: (data?.last_module as OSModuleKey | null) ?? null,
    };
  } catch (error: unknown) {
    const message = String(getErrorMessage(error) || '').toLowerCase();
    if (message.includes('does not exist') || message.includes('relation') || message.includes('permission denied')) {
      return { orgSlug: null, module: null };
    }
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to load last location');
  }
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

  try {
    type SocialUsersUpdateData = Parameters<typeof prisma.social_users.update>[0]['data'];
    const update: SocialUsersUpdateData = {
      updated_at: new Date(),
      last_location_org: orgSlug,
      ...(module ? { last_module: module } : {}),
    };

    await prisma.social_users.update(
      withPrismaTenantIsolationOverride(
        {
          where: { clerk_user_id: clerkUserId },
          data: update,
        },
        {
          source: 'workspace_last_location_persist',
          organizationId: '',
          suppressReporting: true,
        }
      )
    );
  } catch (error: unknown) {
    const message = String(getErrorMessage(error) || '').toLowerCase();
    if (message.includes('does not exist') || message.includes('relation') || message.includes('permission denied')) {
      return;
    }
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to persist last location');
  }
}

export async function requireCurrentOrganizationId(): Promise<string> {
  const clerkUserId = await requireClerkUserId();
  let socialUser: { id: string; organization_id: string | null; role?: string | null } | null = null;
  try {
    socialUser = await getCurrentSocialUser(clerkUserId);
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
      const org = await prisma.social_organizations.findFirst({
        where: { owner_id: socialUser.id },
        select: { id: true },
      });
      if (org?.id) {
        return String(org.id);
      }
    } catch (error: unknown) {
      console.error('[workspace-access] failed to resolve organization by owner_id', {
        clerkUserId,
        socialUserId: socialUser.id,
        message: getErrorMessage(error),
      });
    }
  }
  redirect('/sign-in');
}

export async function getCurrentSocialUser(clerkUserId: string): Promise<{ id: string; organization_id: string | null; role?: string | null } | null> {
  const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';
  const e2eOrgSlug = String(process.env.E2E_ORG_SLUG || '').trim();
  const normalizedClerkUserId = String(clerkUserId || '').trim();
  if (!normalizedClerkUserId) return null;
  try {
    const row = await prisma.social_users.findUnique(
      withPrismaTenantIsolationOverride(
        {
          where: { clerk_user_id: normalizedClerkUserId },
          select: { id: true, organization_id: true, role: true },
        },
        {
          source: 'workspace_access',
          organizationId: '',
          suppressReporting: true,
        }
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
    console.error('[workspace-access] failed to load social_user', {
      clerkUserId: normalizedClerkUserId,
      message: getErrorMessage(error),
    });
    throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to load social_user');
  }
}

export async function getOrganizationEntitlements(
  organizationId: string,
  socialUserId?: string,
  orgSlug?: string,
  preloadedFlags?: OrganizationModuleFlags
): Promise<WorkspaceEntitlements> {
  const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

  let org: OrganizationModuleFlags | null = preloadedFlags || null;
  
  if (!org) {
    try {
      org = await prisma.social_organizations.findUnique({
        where: { id: organizationId },
        select: {
          has_nexus: true,
          has_system: true,
          has_social: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
        },
      });
    } catch (error: unknown) {
      const message = String(getErrorMessage(error) || '').toLowerCase();
      if (isE2E && (message.includes('does not exist') || message.includes('relation') || message.includes('permission denied'))) {
        return await applyLaunchScopeToEntitlements(
          {
            nexus: true,
            system: true,
            social: true,
            finance: true,
            client: true,
            operations: true,
          },
          { organizationId, orgSlug }
        );
      }
      throw error instanceof Error ? error : new Error(getErrorMessage(error) || 'Failed to load organization entitlements');
    }
  }

  if (!org) {
    if (isE2E) {
      return await applyLaunchScopeToEntitlements(
        {
          nexus: true,
          system: true,
          social: true,
          finance: true,
          client: true,
          operations: true,
        },
        { organizationId, orgSlug }
      );
    }
    throw new Error('Organization not found');
  }

  const orgEntitlements = {
    nexus: org?.has_nexus ?? false,
    system: org?.has_system ?? false,
    social: org?.has_social ?? false,
    finance: org?.has_finance ?? false,
    client: org?.has_client ?? false,
    operations: org?.has_operations ?? false,
  };

  // If socialUserId is provided, intersect with user's allowed modules
  if (socialUserId) {
    let user: { allowed_modules: string[] | null; role: string | null } | null = null;
    try {
      user = await prisma.social_users.findFirst({
        where: { id: socialUserId, organization_id: organizationId },
        select: { allowed_modules: true, role: true },
      });
    } catch (error: unknown) {
      console.error('[workspace-access] failed to load allowed_modules for social_user', {
        socialUserId,
        organizationId,
        message: getErrorMessage(error),
      });
      user = null;
    }

    // Owners and Super Admins get everything the organization has
    if (user?.role === 'owner' || user?.role === 'super_admin') {
      return await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });
    }

    if (user?.allowed_modules && Array.isArray(user.allowed_modules)) {
      const userModules = new Set(user.allowed_modules);
      return await applyLaunchScopeToEntitlements(
        {
          nexus: orgEntitlements.nexus && userModules.has('nexus'),
          system: orgEntitlements.system && userModules.has('system'),
          social: orgEntitlements.social && userModules.has('social'),
          finance: orgEntitlements.finance && userModules.has('finance'),
          client: orgEntitlements.client && userModules.has('client'),
          operations: orgEntitlements.operations && userModules.has('operations'),
        },
        { organizationId, orgSlug }
      );
    }
  }

  return await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });
}

async function hasTeamMembership({
  socialUserId,
  organizationId,
}: {
  socialUserId: string;
  organizationId: string;
}): Promise<boolean> {
  try {
    const data = await prisma.social_team_members.findFirst({
      where: {
        user_id: socialUserId,
        organization_id: organizationId,
      },
      select: { id: true },
    });
    return Boolean(data?.id);
  } catch (error: unknown) {
    console.error('[workspace-access] failed to check team membership', {
      socialUserId,
      organizationId,
      message: getErrorMessage(error),
    });
    return false;
  }
}

export function getFirstAllowedModule(entitlements: WorkspaceEntitlements): OSModuleKey | null {
  const order: OSModuleKey[] = ['nexus', 'system', 'operations', 'social', 'finance', 'client'];
  for (const key of order) {
    if (entitlements[key]) return key;
  }
  return null;
}

export async function requireWorkspaceAccessByOrgSlug(orgSlug: string): Promise<WorkspaceInfo> {
  const clerkUserId = await requireClerkUserId();

  if (!orgSlug) {
    throw new Error('Missing orgSlug for workspace route');
  }

  const decodedOrgSlug = decodeMaybeRepeatedly(orgSlug);
  const decodedOnceOrgSlug = decodeOnce(orgSlug);

  let socialUser: { id: string; organization_id: string | null; role?: string | null } | null = null;
  try {
    socialUser = await getCurrentSocialUser(clerkUserId);
  } catch (e: unknown) {
    throw e instanceof Error ? e : new Error(getErrorMessage(e) || 'Failed to load social_user');
  }

  const clerkIsSuperAdmin = await isClerkSuperAdmin();

  if (!socialUser?.id && !clerkIsSuperAdmin) {
    redirect('/sign-in');
  }

  const isSuperAdmin = clerkIsSuperAdmin || String(socialUser?.role || '').toLowerCase() === 'super_admin';

  const organizationKey = decodedOrgSlug;

  if (
    socialUser?.organization_id &&
    isUuidLike(organizationKey) &&
    isUuidLike(String(socialUser.organization_id)) &&
    String(socialUser.organization_id) === String(organizationKey)
  ) {
    let org: { id: string; name: string | null; slug: string | null; logo: string | null; seats_allowed: unknown } & OrganizationModuleFlags | null = null;
    try {
      org = await prisma.social_organizations.findUnique({
        where: { id: String(socialUser.organization_id) },
        select: { 
          id: true, 
          name: true, 
          slug: true, 
          logo: true, 
          seats_allowed: true,
          has_nexus: true,
          has_system: true,
          has_social: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
        },
      });
    } catch (e: unknown) {
      const msg = String(getErrorMessage(e) || '').toLowerCase();
      if (msg.includes('permission denied')) {
        redirect('/maintenance');
      }
      throw e;
    }

    if (!org?.id) {
      console.error('[workspace-access] organization not found -> redirect(/)', {
        orgSlug,
        clerkUserId,
        organizationId: organizationKey,
      });
      redirect('/');
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
      isSuperAdmin ? undefined : socialUser.id,
      decodedOrgSlug,
      org // Pass preloaded flags
    );

    return {
      id: String(org.id),
      slug: org?.slug ?? null,
      name: org?.name ?? 'Workspace',
      logo: org?.logo ?? null,
      seatsAllowed: Number.isFinite(Number(org?.seats_allowed)) ? Number(org?.seats_allowed) : null,
      entitlements,
    };
  }

  // Resolve org by human slug first; if not found, attempt UUID id lookup (backwards compatible).
  let org: { id: string; name: string; owner_id: string | null; slug: string | null; logo: string | null; seats_allowed: unknown } & OrganizationModuleFlags | null = null;
  try {
    const slugCandidates = Array.from(
      new Set(
        [
          organizationKey,
          decodedOnceOrgSlug,
          String(orgSlug || ''),
          encodeURIComponent(organizationKey),
        ]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      )
    );
    const idCandidates = slugCandidates.filter((c) => isUuidLike(c));

    org = await prisma.social_organizations.findFirst({
      where: {
        OR: [
          ...(slugCandidates.length ? [{ slug: { in: slugCandidates } }] : []),
          ...(idCandidates.length ? [{ id: { in: idCandidates } }] : []),
        ],
      },
      select: { 
        id: true, 
        name: true, 
        owner_id: true, 
        slug: true, 
        logo: true, 
        seats_allowed: true,
        has_nexus: true,
        has_system: true,
        has_social: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
      },
    });
  } catch (e: unknown) {
    const msg = String(getErrorMessage(e) || '').toLowerCase();
    if (msg.includes('permission denied')) {
      throw setErrorStatus(new Error('Forbidden'), 403);
    }
    throw e;
  }

  if (!org?.id) {
    console.error('[workspace-access] organization not found -> redirect(/)', {
      orgSlug,
      clerkUserId,
      organizationId: organizationKey,
      orgError: null,
    });
    redirect('/');
  }

  const isOwner = Boolean(org?.owner_id && socialUser?.id && String(org.owner_id) === String(socialUser.id));
  const isPrimary = Boolean(org?.id && socialUser?.organization_id && String(socialUser.organization_id) === String(org.id));

  const isTeamMember = isSuperAdmin
    ? false
    : await hasTeamMembership({ socialUserId: String(socialUser?.id), organizationId: String(org.id) });

  if (!isSuperAdmin && !isOwner && !isPrimary && !isTeamMember) {
    console.error('[workspace-access] forbidden -> redirect(/)', {
      orgSlug,
      clerkUserId,
      organizationId: organizationKey,
      org: { id: org.id, owner_id: org.owner_id },
      socialUser,
      isOwner,
      isPrimary,
      isTeamMember,
      isSuperAdmin,
    });
    redirect('/');
  }

  if (!isSuperAdmin && socialUser?.id) {
    await enforceTrialExpirationBestEffort({
      organizationId: String(org.id),
      socialUserId: String(socialUser.id),
      now: new Date(),
    });
  }

  const entitlements = await getOrganizationEntitlements(org.id, isSuperAdmin ? undefined : socialUser?.id, decodedOrgSlug, org);

  return {
    id: org.id,
    slug: org.slug ?? null,
    name: org.name,
    logo: org.logo ?? null,
    seatsAllowed: Number.isFinite(Number(org.seats_allowed)) ? Number(org.seats_allowed) : null,
    entitlements,
  };
}

export async function requireWorkspaceAccessByOrgSlugUi(orgSlug: string): Promise<WorkspaceInfoWithPackage> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const clerkUserId = await requireClerkUserId();
  let socialUser: { id: string; organization_id: string | null; role?: string | null } | null = null;
  try {
    socialUser = await getCurrentSocialUser(clerkUserId);
  } catch (e: unknown) {
    throw e instanceof Error ? e : new Error(getErrorMessage(e) || 'Failed to load social_user');
  }

  const clerkIsSuperAdmin = await isClerkSuperAdmin();
  const isSuperAdmin = clerkIsSuperAdmin || String(socialUser?.role || '').toLowerCase() === 'super_admin';

  const { packageType, entitlements } = await getOrganizationPackageEntitlements(
    workspace.id,
    isSuperAdmin ? undefined : socialUser?.id,
    orgSlug
  );

  return {
    ...workspace,
    packageType,
    entitlements,
  };
}

export async function requireWorkspaceAccessByOrgSlugApi(orgSlug: string): Promise<WorkspaceInfo> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    throw setErrorStatus(new Error('Unauthorized'), 401);
  }

  const decodedOrgSlug = decodeMaybeRepeatedly(orgSlug);
  const decodedOnceOrgSlug = decodeOnce(orgSlug);

  let socialUser: { id: string; organization_id: string | null; role?: string | null } | null = null;
  try {
    socialUser = await getCurrentSocialUser(clerkUserId);
  } catch (e: unknown) {
    const msg = String(getErrorMessage(e) || '').toLowerCase();
    if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('permission denied')) {
      throw setErrorStatus(new Error('Service unavailable'), 503);
    }
    throw e;
  }

  const clerkIsSuperAdmin = await isClerkSuperAdmin();
  if (!socialUser?.id && !clerkIsSuperAdmin) {
    throw setErrorStatus(new Error('Unauthorized'), 401);
  }

  const isSuperAdmin = clerkIsSuperAdmin || String(socialUser?.role || '').toLowerCase() === 'super_admin';

  if (!socialUser?.id && !isSuperAdmin) {
    throw setErrorStatus(new Error('Unauthorized'), 401);
  }

  const organizationKey = decodedOrgSlug;

  let org: { id: string; name: string; owner_id: string | null; slug: string | null; logo: string | null; seats_allowed: unknown } | null = null;
  try {
    const slugCandidates = Array.from(
      new Set(
        [organizationKey, decodedOnceOrgSlug, String(orgSlug || ''), encodeURIComponent(organizationKey)]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      )
    );
    const idCandidates = slugCandidates.filter((c) => isUuidLike(c));

    org = await prisma.social_organizations.findFirst({
      where: {
        OR: [
          ...(slugCandidates.length ? [{ slug: { in: slugCandidates } }] : []),
          ...(idCandidates.length ? [{ id: { in: idCandidates } }] : []),
        ],
      },
      select: { id: true, name: true, owner_id: true, slug: true, logo: true, seats_allowed: true },
    });
  } catch (e: unknown) {
    const msg = String(getErrorMessage(e) || '').toLowerCase();
    if (msg.includes('permission denied')) {
      throw setErrorStatus(new Error('Service unavailable'), 503);
    }
    throw e;
  }

  if (!org?.id) {
    throw setErrorStatus(new Error('Organization not found'), 404);
  }

  const isOwner = Boolean(org.owner_id && socialUser?.id && String(org.owner_id) === String(socialUser.id));
  const isPrimary = Boolean(org.id && socialUser?.organization_id && String(socialUser.organization_id) === String(org.id));

  const isTeamMember = isSuperAdmin
    ? false
    : await hasTeamMembership({ socialUserId: String(socialUser?.id), organizationId: String(org.id) });

  if (!isSuperAdmin && !isOwner && !isPrimary && !isTeamMember) {
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
    org.id,
    isSuperAdmin ? undefined : socialUser?.id,
    orgSlug
  );

  return {
    id: org.id,
    slug: org.slug ?? null,
    name: org.name,
    logo: org.logo ?? null,
    seatsAllowed: Number.isFinite(Number(org.seats_allowed)) ? Number(org.seats_allowed) : null,
    entitlements,
  };
}

export async function enforceModuleAccessOrRedirect({
  orgSlug,
  module,
}: {
  orgSlug: string;
  module: OSModuleKey;
}) {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);

  const bypassEntitlements = isBypassModuleEntitlementsEnabled();
  if (bypassEntitlements) {
    assertNoProdEntitlementsBypass('enforceModuleAccessOrRedirect');
  }

  const clerkUserId = await getCurrentUserId();
  let socialUser: { id: string; organization_id: string | null; role?: string | null } | null = null;
  if (clerkUserId) {
    try {
      socialUser = await getCurrentSocialUser(clerkUserId);
    } catch (e: unknown) {
      throw e instanceof Error ? e : new Error(getErrorMessage(e) || 'Failed to load social_user');
    }
  }
  const clerkIsSuperAdmin = await isClerkSuperAdmin();
  const isSuperAdmin = clerkIsSuperAdmin || String(socialUser?.role || '').toLowerCase() === 'super_admin';

  if (workspace.entitlements[module]) {
    return workspace;
  }

  if (isSuperAdmin) {
    return workspace;
  }

  if (bypassEntitlements) {
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
