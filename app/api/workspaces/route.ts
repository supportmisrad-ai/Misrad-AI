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
const workspacesInFlight = new Map<string, Promise<{ workspaces: WorkspaceApiItem[] }>>();
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
  subscriptionPlan: string | null;
  onboardingComplete: boolean;
};

async function GETHandler() {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    // Return empty workspaces for unauthenticated users - consistent format
    return apiSuccess({ workspaces: [] as WorkspaceApiItem[] }, { status: 401 });
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
    try {
      const actor = await resolveWorkspaceActorApi(clerkUserId);
      socialUser = actor.socialUser as { id: string; organization_id: string | null } | null;
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

    // CRITICAL FIX: If no organizationUser exists yet, this is a first-time user.
    // Return empty array immediately so the client can redirect to /workspaces/new
    // This prevents race conditions where user is created but organizationUser is not yet ready
    if (!socialUser?.id) {
      console.log(`[Workspaces API] No organizationUser found for clerkUserId=${clerkUserId.substring(0, 8)}..., returning empty workspaces`);
      return { workspaces: [] as WorkspaceApiItem[] };
    }

    // Always filter by the user's actual memberships — even super admins.
    // Admin access to all orgs is available through /app/admin/organizations only.
    const [ownedOrgs, membershipRows] = await Promise.all([
      prisma.organization.findMany({
        where: { owner_id: socialUser.id },
        select: { id: true },
      }),
      prisma.teamMember.findMany({
        where: { user_id: socialUser.id },
        select: { organization_id: true },
      }),
    ]);

    const orgIds = new Set<string>();
    if (socialUser.organization_id) {
      orgIds.add(String(socialUser.organization_id));
    }
    for (const org of ownedOrgs) {
      if (org?.id) orgIds.add(String(org.id));
    }
    for (const row of membershipRows) {
      if (row.organization_id) orgIds.add(String(row.organization_id));
    }
    const ids = Array.from(orgIds).filter(Boolean);

    if (ids.length === 0) {
      return { workspaces: [] as WorkspaceApiItem[] };
    }

    const [systemFlags, orgs, customerAccounts] = await Promise.all([
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
          subscription_plan: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.customerAccount.findMany({
        where: { organizationId: { in: ids } },
        select: { organizationId: true, company_name: true, phone: true },
      }),
    ]);

    // DEBUG: Check for duplicates
    const seenIds = new Set<string>();
    const duplicates: string[] = [];
    for (const org of orgs) {
      if (seenIds.has(org.id)) {
        duplicates.push(org.id);
      }
      seenIds.add(org.id);
    }
    if (duplicates.length > 0) {
      console.error(`[Workspaces API] Duplicate orgs found: ${duplicates.join(', ')}`);
    }
    // DEBUG: Check for duplicate slugs
    const slugCounts: Record<string, number> = {};
    for (const org of orgs) {
      const slug = org.slug || 'null';
      slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    }
    const dupSlugs = Object.entries(slugCounts).filter(([_, count]) => count > 1);
    if (dupSlugs.length > 0) {
      console.error(`[Workspaces API] Duplicate slugs found:`, dupSlugs);
    }

    const customerDetailsByOrg = new Map<string, { hasCompany: boolean; hasPhone: boolean }>();
    for (const ca of customerAccounts) {
      customerDetailsByOrg.set(ca.organizationId, {
        hasCompany: Boolean(ca.company_name && String(ca.company_name).trim()),
        hasPhone: Boolean(ca.phone && String(ca.phone).trim()),
      });
    }

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
        subscriptionPlan: o.subscription_plan ?? null,
        onboardingComplete: (() => {
          if (!o.subscription_plan) return false;
          const details = customerDetailsByOrg.get(o.id);
          // Case 1: Customer account with full details → complete
          if (details?.hasCompany && details?.hasPhone) return true;
          // Case 2: No customer account → needs onboarding
          if (!details) return false;
          // Case 3: Customer account exists but details missing → not complete
          return false;
        })(),
      };
    });

    const ttlSeconds = 60 * 60;

    // Fast-path: skip signing for null/empty logos or already-public URLs (avoids I/O per workspace)
    const needsSigning = (logo: string | null | undefined): boolean => {
      if (!logo) return false;
      const s = String(logo).trim();
      // Public CDN URLs don't need signing
      if (s.startsWith('https://images.') || s.startsWith('https://img.')) return false;
      // Only Supabase storage paths need signing
      return s.startsWith('/') || s.includes('supabase');
    };

    const resolved = await Promise.all(
      workspaces.map(async (w) => {
        if (!needsSigning(w.logo)) {
          return { ...w, logo: w.logo ?? null };
        }
        const signedLogo = await resolveStorageUrlMaybeServiceRole(w.logo, ttlSeconds, {
          organizationId: String(w.id),
          orgSlug: w.slug,
        });
        return { ...w, logo: signedLogo ?? null };
      })
    );

    void logAuditEvent('data.read', 'workspaces.list', {
      details: {
        workspaceCount: resolved.length,
        primaryOrganizationId: socialUser?.organization_id ?? null,
      },
    });

    return { workspaces: resolved };
  }
  );

  workspacesInFlight.set(clerkUserId, loadPromise);
  try {
    const result = await loadPromise;
    // Handle both { workspaces: [...] } and legacy array formats
    const workspaces = Array.isArray(result) ? result : (result.workspaces || []);
    workspacesCache.set(clerkUserId, { value: workspaces, expiresAt: Date.now() + WORKSPACES_TTL_MS });
    return apiSuccess({ workspaces });
  } catch (error: unknown) {
    console.error(`[/api/workspaces] Failed to load workspaces for clerkUserId=${clerkUserId.substring(0, 8)}...:`, error);
    return apiError('שגיאה לא צפויה', { status: 500 });
  } finally {
    workspacesInFlight.delete(clerkUserId);
  }
}

export const GET = shabbatGuard(GETHandler);
