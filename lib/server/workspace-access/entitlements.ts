import 'server-only';

import prisma, { accelerateCache } from '@/lib/prisma';
import { OSModuleKey } from '@/lib/os/modules/types';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';

import { asObject, getErrorMessage, logWorkspaceAccessError, parseEnvCsv, redactId } from './utils';
import type { OrganizationModuleFlags, PackageType, WorkspaceEntitlements } from './types';

function isOSModuleKey(value: unknown): value is OSModuleKey {
  return (
    value === 'nexus' ||
    value === 'system' ||
    value === 'social' ||
    value === 'finance' ||
    value === 'client' ||
    value === 'operations'
  );
}

function isInternalWorkspace(params: { organizationId?: string | null; orgSlug?: string | null }): boolean {
  const orgId = params.organizationId ? String(params.organizationId).trim() : '';
  const orgSlug = params.orgSlug ? String(params.orgSlug).trim() : '';

  const envIds = new Set([...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_ID), ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_IDS)]);
  const envSlugs = new Set([...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_SLUG), ...parseEnvCsv(process.env.MISRAD_INTERNAL_ORG_SLUGS)]);

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
    logWorkspaceAccessError('[workspace-access] failed to apply launch scope entitlements', {
      organizationId: redactId(ctx?.organizationId ?? null),
      orgSlug: redactId(ctx?.orgSlug ?? null),
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

function normalizeCouponAllowedModules(raw: unknown): Set<OSModuleKey> | null {
  if (!Array.isArray(raw)) return null;
  const out = new Set<OSModuleKey>();
  for (const v of raw) {
    if (isOSModuleKey(v)) out.add(v);
    else {
      const s = String(v ?? '').trim().toLowerCase();
      if (isOSModuleKey(s)) out.add(s);
    }
  }
  return out.size ? out : null;
}

export function getPackageModules(packageType: PackageType): OSModuleKey[] {
  const def = (BILLING_PACKAGES as Record<string, unknown>)[packageType];
  const defObj = asObject(def);
  const modules = defObj?.modules;
  if (modules && Array.isArray(modules)) {
    return modules as OSModuleKey[];
  }
  if (packageType === 'the_closer') return ['system', 'nexus'];
  if (packageType === 'the_authority') return ['social', 'nexus'];
  if (packageType === 'the_mentor') return ['nexus', 'system', 'social', 'client', 'operations'];
  return ['nexus'];
}

export function inferOrganizationPackageType(flags: OrganizationModuleFlags): PackageType {
  // Finance is now a free bonus, so don't use it to infer package type
  if (flags.has_nexus && flags.has_system && flags.has_social && flags.has_client && flags.has_operations) {
    return 'the_empire';
  }

  if (flags.has_operations) return 'the_operator';
  if (flags.has_social || flags.has_client) return 'the_authority';
  return 'the_closer';
}

async function loadOrganizationModuleFlags(organizationId: string): Promise<OrganizationModuleFlags> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        has_nexus: true,
        has_system: true,
        has_social: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
      },
      ...accelerateCache({ ttl: 30, swr: 60 }),
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
    if (isE2E && (message.includes('does not exist') || message.includes('relation') || message.includes('permission denied'))) {
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
  const flags = preloadedFlags || (await loadOrganizationModuleFlags(organizationId));
  const packageType = inferOrganizationPackageType(flags);

  const baseOrgEntitlements: WorkspaceEntitlements = {
    nexus: flags.has_nexus ?? false,
    system: flags.has_system ?? false,
    social: flags.has_social ?? false,
    finance: flags.has_finance ?? false,
    client: flags.has_client ?? false,
    operations: flags.has_operations ?? false,
  };

  const couponAllowed = normalizeCouponAllowedModules(flags.coupon_allowed_modules);
  const orgEntitlements: WorkspaceEntitlements = couponAllowed
    ? {
        nexus: Boolean(baseOrgEntitlements.nexus && couponAllowed.has('nexus')),
        system: Boolean(baseOrgEntitlements.system && couponAllowed.has('system')),
        social: Boolean(baseOrgEntitlements.social && couponAllowed.has('social')),
        finance: Boolean(baseOrgEntitlements.finance && couponAllowed.has('finance')),
        client: Boolean(baseOrgEntitlements.client && couponAllowed.has('client')),
        operations: Boolean(baseOrgEntitlements.operations && couponAllowed.has('operations')),
      }
    : baseOrgEntitlements;

  if (socialUserId) {
    const user = await prisma.organizationUser.findFirst({
      where: { id: socialUserId, organization_id: organizationId },
      select: { allowed_modules: true, role: true },
      ...accelerateCache({ ttl: 30, swr: 60 }),
    });

    if (user?.role === 'owner' || user?.role === 'super_admin') {
      const entitlements = await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });
      return { packageType, entitlements };
    }

    if (user?.allowed_modules && Array.isArray(user.allowed_modules)) {
      const entitlements = await applyLaunchScopeToEntitlements(
        buildEntitlementsFromAllowedModules(user.allowed_modules.filter(isOSModuleKey)),
        { organizationId, orgSlug }
      );

      return {
        packageType,
        entitlements: {
          nexus: Boolean(entitlements.nexus && orgEntitlements.nexus),
          system: Boolean(entitlements.system && orgEntitlements.system),
          social: Boolean(entitlements.social && orgEntitlements.social),
          finance: Boolean(entitlements.finance && orgEntitlements.finance),
          client: Boolean(entitlements.client && orgEntitlements.client),
          operations: Boolean(entitlements.operations && orgEntitlements.operations),
        },
      };
    }
  }

  const entitlements = await applyLaunchScopeToEntitlements(orgEntitlements, { organizationId, orgSlug });
  return { packageType, entitlements };
}

export async function getOrganizationEntitlements(
  organizationId: string,
  socialUserId?: string,
  orgSlug?: string,
  preloadedFlags?: OrganizationModuleFlags,
  preloadedUserModules?: { role: string | null; allowed_modules: string[] | null } | null
): Promise<WorkspaceEntitlements> {
  const isE2E = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

  let org: OrganizationModuleFlags | null = preloadedFlags || null;

  if (!org) {
    try {
      org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          has_nexus: true,
          has_system: true,
          has_social: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
          coupon_allowed_modules: true,
        },
        ...accelerateCache({ ttl: 30, swr: 60 }),
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

  const baseOrgEntitlements: WorkspaceEntitlements = {
    nexus: org?.has_nexus ?? false,
    system: org?.has_system ?? false,
    social: org?.has_social ?? false,
    finance: org?.has_finance ?? false,
    client: org?.has_client ?? false,
    operations: org?.has_operations ?? false,
  };

  const couponAllowed = normalizeCouponAllowedModules(org.coupon_allowed_modules);
  const orgEntitlements: WorkspaceEntitlements = couponAllowed
    ? {
        nexus: Boolean(baseOrgEntitlements.nexus && couponAllowed.has('nexus')),
        system: Boolean(baseOrgEntitlements.system && couponAllowed.has('system')),
        social: Boolean(baseOrgEntitlements.social && couponAllowed.has('social')),
        finance: Boolean(baseOrgEntitlements.finance && couponAllowed.has('finance')),
        client: Boolean(baseOrgEntitlements.client && couponAllowed.has('client')),
        operations: Boolean(baseOrgEntitlements.operations && couponAllowed.has('operations')),
      }
    : baseOrgEntitlements;

  if (socialUserId) {
    let user: { allowed_modules: string[] | null; role: string | null } | null = preloadedUserModules ?? null;
    if (!user) {
      try {
        user = await prisma.organizationUser.findFirst({
          where: { id: socialUserId, organization_id: organizationId },
          select: { allowed_modules: true, role: true },
          ...accelerateCache({ ttl: 30, swr: 60 }),
        });
      } catch (error: unknown) {
        logWorkspaceAccessError('[workspace-access] failed to load allowed_modules for social_user', {
          socialUserId: redactId(socialUserId),
          organizationId: redactId(organizationId),
          message: getErrorMessage(error),
        });
        user = null;
      }
    }

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
