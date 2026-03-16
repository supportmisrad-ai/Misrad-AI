import 'server-only';

import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride } from '@/lib/prisma-tenant-guard';
import { getErrorMessage, isUuidLike, logWorkspaceAccessError, redactId, setErrorStatus } from './utils';
import type { OrganizationRow, SocialUserRow } from './types';

const WORKSPACE_ACCESS_DEBUG =
  process.env.NODE_ENV === 'development' &&
  (String(process.env.WORKSPACE_ACCESS_DEBUG || '').toLowerCase() === 'true' ||
    String(process.env.WORKSPACE_ACCESS_DEBUG || '').toLowerCase() === '1');

export async function resolveOrganizationForWorkspaceAccessUi(params: {
  orgSlug: string;
  decodedOrgSlug: string;
  decodedOnceOrgSlug: string;
  socialUser: SocialUserRow | null;
}): Promise<OrganizationRow> {
  const organizationKey = params.decodedOrgSlug;

  if (
    params.socialUser?.organization_id &&
    isUuidLike(organizationKey) &&
    isUuidLike(String(params.socialUser.organization_id)) &&
    String(params.socialUser.organization_id) === String(organizationKey)
  ) {
    let org: OrganizationRow | null = null;
    try {
      org = await prisma.organization.findUnique({
        where: { id: String(params.socialUser.organization_id) },
        select: {
          id: true,
          name: true,
          owner_id: true,
          slug: true,
          logo: true,
          seats_allowed: true,
          coupon_seats_cap: true,
          coupon_allowed_modules: true,
          is_shabbat_protected: true,
          subscription_status: true,
          subscription_plan: true,
          trial_end_date: true,
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
        throw setErrorStatus(new Error('Service unavailable'), 503);
      }
      throw e;
    }

    if (!org?.id) {
      if (WORKSPACE_ACCESS_DEBUG) {
        logWorkspaceAccessError('[workspace-access] organization not found -> redirect(/)', {
          orgSlug: redactId(params.orgSlug),
          organizationKey: redactId(organizationKey),
        });
      }
      throw setErrorStatus(new Error('Organization not found'), 404);
    }

    return org;
  }

  let org: OrganizationRow | null = null;
  try {
    const slugCandidates = Array.from(
      new Set(
        [organizationKey, params.decodedOnceOrgSlug, String(params.orgSlug || ''), encodeURIComponent(organizationKey)]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      )
    );
    const idCandidates = slugCandidates.filter((c) => isUuidLike(c));

    org = await prisma.organization.findFirst(
      withPrismaTenantIsolationOverride(
        {
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
            coupon_seats_cap: true,
            coupon_allowed_modules: true,
            is_shabbat_protected: true,
            subscription_status: true,
            subscription_plan: true,
            trial_end_date: true,
            has_nexus: true,
            has_system: true,
            has_social: true,
            has_finance: true,
            has_client: true,
            has_operations: true,
          },
        },
        { suppressReporting: true, reason: 'workspace_access_resolve_org_by_slug_candidates', source: 'workspace_access' }
      )
    );
  } catch (e: unknown) {
    const msg = String(getErrorMessage(e) || '').toLowerCase();
    if (msg.includes('permission denied')) {
      throw setErrorStatus(new Error('Forbidden'), 403);
    }
    throw e;
  }

  if (!org?.id) {
    if (WORKSPACE_ACCESS_DEBUG) {
      logWorkspaceAccessError('[workspace-access] organization not found -> redirect(/)', {
        orgSlug: redactId(params.orgSlug),
        organizationKey: redactId(organizationKey),
        orgError: null,
      });
    }
    throw setErrorStatus(new Error('Organization not found'), 404);
  }

  return org;
}

export async function resolveOrganizationForWorkspaceAccessApi(params: {
  orgSlug: string;
  decodedOrgSlug: string;
  decodedOnceOrgSlug: string;
}): Promise<OrganizationRow> {
  const organizationKey = params.decodedOrgSlug;
  let org: OrganizationRow | null = null;
  let slugCandidates: string[] = [];
  let idCandidates: string[] = [];

  try {
    slugCandidates = Array.from(
      new Set(
        [organizationKey, params.decodedOnceOrgSlug, String(params.orgSlug || ''), encodeURIComponent(organizationKey)]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      )
    );
    idCandidates = slugCandidates.filter((c) => isUuidLike(c));

    org = await prisma.organization.findFirst(
      withPrismaTenantIsolationOverride(
        {
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
            coupon_seats_cap: true,
            coupon_allowed_modules: true,
            is_shabbat_protected: true,
            subscription_status: true,
            subscription_plan: true,
            trial_end_date: true,
            has_nexus: true,
            has_system: true,
            has_social: true,
            has_finance: true,
            has_client: true,
            has_operations: true,
          },
        },
        {
          suppressReporting: true,
          source: 'workspace_access',
          organizationId: '',
          reason: 'workspace_access_api_resolve_org_by_slug_candidates',
        }
      )
    );
  } catch (e: unknown) {
    const msg = String(getErrorMessage(e) || '').toLowerCase();
    if (msg.includes('permission denied')) {
      throw setErrorStatus(new Error('Service unavailable'), 503);
    }
    throw e;
  }

  if (!org?.id) {
    if (WORKSPACE_ACCESS_DEBUG) {
      logWorkspaceAccessError('[workspace-access] Organization not found', {
        originalOrgSlug: redactId(params.orgSlug),
        decodedOrgSlug: redactId(params.decodedOrgSlug),
        decodedOnceOrgSlug: redactId(params.decodedOnceOrgSlug),
        slugCandidates: slugCandidates.map((c) => redactId(c)),
        idCandidates: idCandidates.map((c) => redactId(c)),
      });
    }
    throw setErrorStatus(new Error('Organization not found'), 404);
  }

  return org;
}
