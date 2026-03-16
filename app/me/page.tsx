import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation } from '@/lib/server/workspace';

import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

// Force dynamic rendering as this page depends on authentication
// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

const ME_PAGE_DEBUG =
  process.env.NODE_ENV !== 'production' &&
  String(process.env.NEXT_PUBLIC_ME_PAGE_DEBUG || process.env.ME_PAGE_DEBUG || '')
    .trim()
    .toLowerCase() === 'true';

function meLog(...args: unknown[]) {
  if (!ME_PAGE_DEBUG) return;
  console.log(...args);
}

async function resolveRedirectWorkspaceSlugForCurrentUser(): Promise<{ slug: string; hasPlan: boolean } | null> {
  return await withTenantIsolationContext(
    { suppressReporting: true, reason: 'me_page_resolve_redirect_workspace_slug', source: 'me-page-redirect' },
    async () => {
      const clerkUserId = await getCurrentUserId();
      if (!clerkUserId) {
        meLog('[MePage] No current user');
        return null;
      }

      // Stage 1: Get social user (required for subsequent queries)
      meLog('[MePage] Looking up organization_user for clerkUserId:', clerkUserId);
      const socialUser = await prisma.organizationUser.findUnique(
        withPrismaTenantIsolationOverride({
          where: { clerk_user_id: clerkUserId },
          select: { id: true, organization_id: true },
        }, { suppressReporting: true, reason: 'me_page_lookup_social_user_by_clerk_user_id', source: 'me-page-redirect' })
      );

      if (!socialUser?.id) {
        meLog('[MePage] No organization_user record found for clerkUserId:', clerkUserId);
        return null;
      }

      // Stage 2: Run ALL independent queries in parallel (was sequential before)
      const [ownedOrgs, memberships, last] = await Promise.all([
        prisma.organization.findMany(
          withPrismaTenantIsolationOverride({
            where: { owner_id: String(socialUser.id) },
            select: { id: true },
          }, { suppressReporting: true, reason: 'me_page_lookup_owned_orgs_by_social_user_id', source: 'me-page-redirect' })
        ),
        prisma.teamMember.findMany(
          withPrismaTenantIsolationOverride({
            where: { user_id: String(socialUser.id) },
            select: { organization_id: true },
          }, { suppressReporting: true, reason: 'me_page_lookup_team_memberships_by_social_user_id', source: 'me-page-redirect' })
        ),
        loadCurrentUserLastLocation(),
      ]);

      const orgIds = new Set<string>();
      if (socialUser.organization_id) {
        orgIds.add(String(socialUser.organization_id));
      }
      for (const row of ownedOrgs) {
        if (row?.id) orgIds.add(String(row.id));
      }
      for (const row of memberships) {
        if (row?.organization_id) orgIds.add(String(row.organization_id));
      }

      const ids = Array.from(orgIds);
      meLog('[MePage] Total organization IDs found:', ids.length, ids);
      if (!ids.length) {
        return null;
      }

      // Stage 3: Get org details + subscription_plan (merged onboarding check — saves a round-trip)
      const orgs = await prisma.organization.findMany(
        withPrismaTenantIsolationOverride({
          where: { id: { in: ids } },
          select: { id: true, slug: true, subscription_plan: true, subscription_status: true },
        }, { suppressReporting: true, reason: 'me_page_lookup_org_details_by_ids', source: 'me-page-redirect' })
      );

      if (!orgs.length) {
        return null;
      }

      // Resolve best org: prefer last location > primary org > first available
      type OrgRow = { id: string; slug: string | null; subscription_plan: string | null; subscription_status: string | null };
      function toResult(o: OrgRow) {
        return { slug: String(o.slug || o.id), hasPlan: Boolean(o.subscription_plan), isExpired: o.subscription_status === 'expired' };
      }

      const lastKey = last?.orgSlug ? String(last.orgSlug) : '';
      if (lastKey) {
        const match = orgs.find((o: OrgRow) => String(o.slug || '') === lastKey || String(o.id) === lastKey);
        if (match) return toResult(match);
      }

      const primaryId = socialUser.organization_id ? String(socialUser.organization_id) : '';
      if (primaryId) {
        const match = orgs.find((o: OrgRow) => String(o.id) === primaryId);
        if (match) return toResult(match);
      }

      return toResult(orgs[0]);
    }
  );
}

export default async function MePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  // Smart routing: authenticated users go to their workspace
  // Non-authenticated users go to login
  const clerkUserId = await getCurrentUserId();
  
  if (!clerkUserId) {
    // Not logged in -> redirect to sign in
    redirect('/login');
  }

  let resolved: { slug: string; hasPlan: boolean; isExpired?: boolean } | null = null;
  let retryCount = 0;
  const MAX_RETRIES = 2;
  
  while (!resolved && retryCount < MAX_RETRIES) {
    try {
      resolved = await resolveRedirectWorkspaceSlugForCurrentUser();
    } catch (error) {
      console.error(`[MePage] Attempt ${retryCount + 1} failed to resolve redirect workspace:`, error);
      if (retryCount < MAX_RETRIES - 1) {
        // Wait a bit before retry - gives time for webhook/user creation to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    retryCount++;
  }
  
  if (!resolved) {
    console.error('[MePage] All attempts failed to resolve workspace');
  }

  if (resolved) {
    // Check if trial expired - redirect to trial-expired page
    if (resolved.isExpired) {
      redirect('/app/trial-expired');
    }

    // Onboarding check: subscription_plan was already fetched in Stage 3 (zero extra queries)
    if (!resolved.hasPlan) {
      redirect('/workspaces/onboarding');
    }

    // Preserve query parameters when redirecting
    const sp = searchParams ? await Promise.resolve(searchParams) : {};
    const queryString = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (value) {
        const val = Array.isArray(value) ? value[0] : value;
        if (val) queryString.set(key, String(val));
      }
    }
    const qs = queryString.toString();
    const targetUrl = qs ? `/w/${encodeURIComponent(resolved.slug)}?${qs}` : `/w/${encodeURIComponent(resolved.slug)}`;
    redirect(targetUrl);
  }

  // No workspace found -> go to workspaces page
  redirect('/workspaces');
}
