import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation } from '@/lib/server/workspace';
import { getAuthenticatedUser } from '@/lib/auth';
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

async function resolveRedirectWorkspaceSlugForCurrentUser(): Promise<string | null> {
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

      // Stage 3: Get org details (needs IDs from stage 2)
      const orgs = await prisma.organization.findMany(
        withPrismaTenantIsolationOverride({
          where: { id: { in: ids } },
          select: { id: true, slug: true },
        }, { suppressReporting: true, reason: 'me_page_lookup_org_details_by_ids', source: 'me-page-redirect' })
      );

      if (!orgs.length) {
        return null;
      }

      // Resolve best org: prefer last location > primary org > first available
      const lastKey = last?.orgSlug ? String(last.orgSlug) : '';
      if (lastKey) {
        const match = orgs.find((o: { id: string; slug: string | null }) => String(o.slug || '') === lastKey || String(o.id) === lastKey);
        if (match) {
          return String(match.slug || match.id);
        }
      }

      const primaryId = socialUser.organization_id ? String(socialUser.organization_id) : '';
      if (primaryId) {
        const match = orgs.find((o: { id: string; slug: string | null }) => String(o.id) === primaryId);
        if (match) {
          return String(match.slug || match.id);
        }
      }

      return String(orgs[0].slug || orgs[0].id);
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

  let orgSlug: string | null = null;
  try {
    orgSlug = await resolveRedirectWorkspaceSlugForCurrentUser();
  } catch (error) {
    console.error('[MePage] failed to resolve redirect workspace:', error);
  }

  if (orgSlug) {
    // Check if onboarding is complete (plan + company name + phone) before sending to workspace
    const onboardingCheck = await withTenantIsolationContext(
      { suppressReporting: true, reason: 'me_page_check_onboarding', source: 'me-page-redirect' },
      async () => {
        const slugFilter = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgSlug ?? '');
        const allOrgs = await prisma.organization.findMany(
          withPrismaTenantIsolationOverride({
            where: { OR: [{ slug: orgSlug }, ...(slugFilter ? [{ id: orgSlug }] : [])] },
            select: { id: true, subscription_plan: true },
          }, { suppressReporting: true, reason: 'me_page_check_plan', source: 'me-page-redirect' })
        );
        const org = allOrgs[0] ?? null;
        if (!org?.subscription_plan) return { complete: false };

        const account = await prisma.customerAccount.findFirst({
          where: { organizationId: org.id },
          select: { company_name: true, phone: true },
        });
        const hasCompany = Boolean(account?.company_name && String(account.company_name).trim());
        const hasPhone = Boolean(account?.phone && String(account.phone).trim());
        return { complete: hasCompany && hasPhone };
      }
    );

    if (!onboardingCheck.complete) {
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
    const targetUrl = qs ? `/w/${encodeURIComponent(orgSlug)}?${qs}` : `/w/${encodeURIComponent(orgSlug)}`;
    redirect(targetUrl);
  }

  // No workspace found -> go to workspaces page
  redirect('/workspaces');
}
