import { getCurrentUserId } from '@/lib/server/authHelper';
import { OSModuleKey } from '@/lib/os/modules/types';
import { logAuditEvent } from '@/lib/audit';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { asObject } from '@/lib/shared/unknown';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import { resolveWorkspaceActorApi } from '@/lib/server/workspace-access/actor';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

type CacheEntry<T> = { value: T; expiresAt: number };
const workspacesCache = new Map<string, CacheEntry<WorkspaceApiItem[]>>();
const workspacesInFlight = new Map<string, Promise<WorkspaceApiItem[]>>();
const WORKSPACES_TTL_MS = 30_000;

type WorkspaceApiItem = {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  isShabbatProtected: boolean;
  entitlements: Record<OSModuleKey, boolean>;
  capabilities: {
    isFullOffice: boolean;
    isTeamManagementEnabled: boolean;
    seatsAllowed: number;
  };
};

async function GETHandler() {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    return apiError('אין הרשאה', { status: 401 });
  }

  const cached = workspacesCache.get(clerkUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return apiSuccess({ workspaces: cached.value });
  }

  const inFlight = workspacesInFlight.get(clerkUserId);
  if (inFlight) {
    const workspaces = await inFlight;
    return apiSuccess({ workspaces });
  }

  const loadPromise = withTenantIsolationContext(
    { source: 'api_workspaces_list', reason: 'list_user_workspaces', suppressReporting: true },
    async () => {
    let socialUser: { id: string; organization_id: string | null } | null = null;
    let isSuperAdmin = false;
    try {
      const actor = await resolveWorkspaceActorApi(clerkUserId);
      socialUser = actor.socialUser as { id: string; organization_id: string | null } | null;
      isSuperAdmin = actor.isSuperAdmin;
    } catch (err) {
      if (IS_PROD) console.error('GET /api/workspaces failed to resolve actor');
      else console.error('GET /api/workspaces failed to resolve actor', err);
      // Fallback to direct query
      try {
        socialUser = await prisma.organizationUser.findUnique({
          where: { clerk_user_id: clerkUserId },
          select: { id: true, organization_id: true },
        });
      } catch (err2) {
        if (IS_PROD) console.error('GET /api/workspaces failed to query social_users');
        else console.error('GET /api/workspaces failed to query social_users', err2);
        throw err2;
      }
    }

    if (!socialUser?.id && !isSuperAdmin) {
      return [] as WorkspaceApiItem[];
    }

    let ids: string[];

    if (isSuperAdmin) {
      // Super admins see ALL organizations
      const allOrgs = await prisma.organization.findMany({ select: { id: true } });
      ids = allOrgs.map((o) => String(o.id)).filter(Boolean);
    } else {
      const [ownedOrgs, membershipRows] = await Promise.all([
        prisma.organization.findMany({
          where: { owner_id: socialUser!.id },
          select: { id: true },
        }),
        prisma.teamMember.findMany({
          where: { user_id: socialUser!.id },
          select: { organization_id: true },
        }),
      ]);

      const orgIds = new Set<string>();
      if (socialUser!.organization_id) {
        orgIds.add(String(socialUser!.organization_id));
      }
      for (const org of ownedOrgs) {
        if (org?.id) orgIds.add(String(org.id));
      }
      for (const row of membershipRows) {
        if (row.organization_id) orgIds.add(String(row.organization_id));
      }
      ids = Array.from(orgIds).filter(Boolean);
    }

    if (ids.length === 0) {
      return [] as WorkspaceApiItem[];
    }

    const [systemFlags, orgs] = await Promise.all([
      getSystemFeatureFlags(),
      prisma.organization.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          slug: true,
          name: true,
          logo: true,
          is_shabbat_protected: true,
          has_nexus: true,
          has_system: true,
          has_social: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
          seats_allowed: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // Sort: primary workspace first, then by creation date (newest first)
    const primaryOrgId = socialUser?.organization_id ?? null;
    const sortedOrgs = [...orgs].sort((a, b) => {
      if (a.id === primaryOrgId) return -1;
      if (b.id === primaryOrgId) return 1;
      return 0;
    });

    const workspaces: WorkspaceApiItem[] = sortedOrgs.map((o) => {
      const entitlements = {
        nexus: o.has_nexus ?? false,
        system: o.has_system ?? false,
        social: o.has_social ?? false,
        finance: o.has_finance ?? false,
        client: o.has_client ?? false,
        operations: Boolean(o.has_operations ?? false),
      };

      return {
        id: o.id,
        slug: o.slug || o.id,
        name: o.name,
        logo: o.logo,
        isShabbatProtected: (() => {
          const obj = asObject(o) ?? {};
          const raw = obj.is_shabbat_protected;
          return raw === false ? false : true;
        })(),
        entitlements,
        capabilities: computeWorkspaceCapabilities({
          entitlements,
          fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance),
          seatsAllowedOverride: o.seats_allowed ?? null,
        }),
      };
    });

    const ttlSeconds = 60 * 60;

    const resolved = await Promise.all(
      workspaces.map(async (w) => {
        const signedLogo = await resolveStorageUrlMaybeServiceRole(w.logo, ttlSeconds, { organizationId: String(w.id) });
        return { ...w, logo: signedLogo ?? null };
      })
    );

    void logAuditEvent('data.read', 'workspaces.list', {
      details: {
        workspaceCount: resolved.length,
        primaryOrganizationId: socialUser?.organization_id ?? null,
      },
    });

    return resolved;
  }
  );

  workspacesInFlight.set(clerkUserId, loadPromise);
  try {
    const workspaces = await loadPromise;
    workspacesCache.set(clerkUserId, { value: workspaces, expiresAt: Date.now() + WORKSPACES_TTL_MS });
    return apiSuccess({ workspaces });
  } catch (error: unknown) {
    console.error('[/api/workspaces] Failed to load workspaces:', error);
    return apiError('שגיאה לא צפויה', { status: 500 });
  } finally {
    workspacesInFlight.delete(clerkUserId);
  }
}

export const GET = shabbatGuard(GETHandler);
