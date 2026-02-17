import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation } from '@/lib/server/workspace';
import { getAuthenticatedUser } from '@/lib/auth';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

// Force dynamic rendering as this page depends on authentication
export const dynamic = 'force-dynamic';

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

      meLog('[MePage] Looking up organization_user for clerkUserId:', clerkUserId);
      const socialUser = await prisma.organizationUser.findUnique(
        withPrismaTenantIsolationOverride({
          where: { clerk_user_id: clerkUserId },
          select: { id: true, organization_id: true },
        }, { suppressReporting: true, reason: 'me_page_lookup_social_user_by_clerk_user_id', source: 'me-page-redirect' })
      );

      meLog('[MePage] organization_user found:', socialUser ? 'YES' : 'NO', socialUser);

      if (!socialUser?.id) {
        meLog('[MePage] No organization_user record found for clerkUserId:', clerkUserId);
        return null;
      }

      const orgIds = new Set<string>();

      if (socialUser.organization_id) {
        orgIds.add(String(socialUser.organization_id));
        meLog('[MePage] Added primary organization_id:', socialUser.organization_id);
      }

      meLog('[MePage] Looking for owned organizations for user:', socialUser.id);
      const ownedOrgs = await prisma.organization.findMany(
        withPrismaTenantIsolationOverride({
          where: { owner_id: String(socialUser.id) },
          select: { id: true },
        }, { suppressReporting: true, reason: 'me_page_lookup_owned_orgs_by_social_user_id', source: 'me-page-redirect' })
      );

      meLog('[MePage] Found owned organizations:', ownedOrgs.length);
      for (const row of ownedOrgs) {
        if (row?.id) {
          orgIds.add(String(row.id));
          meLog('[MePage] Added owned organization_id:', row.id);
        }
      }

      meLog('[MePage] Looking for team memberships for user:', socialUser.id);
      const memberships = await prisma.teamMember.findMany(
        withPrismaTenantIsolationOverride({
          where: { user_id: String(socialUser.id) },
          select: { organization_id: true },
        }, { suppressReporting: true, reason: 'me_page_lookup_team_memberships_by_social_user_id', source: 'me-page-redirect' })
      );

      meLog('[MePage] Found team memberships:', memberships.length);
      for (const row of memberships) {
        if (row?.organization_id) {
          orgIds.add(String(row.organization_id));
          meLog('[MePage] Added membership organization_id:', row.organization_id);
        }
      }

      const ids = Array.from(orgIds);
      meLog('[MePage] Total organization IDs found:', ids.length, ids);
      if (!ids.length) {
        meLog('[MePage] No organizations found for user');
        return null;
      }

      meLog('[MePage] Looking up organization details for IDs:', ids);
      const orgs = await prisma.organization.findMany(
        withPrismaTenantIsolationOverride({
          where: { id: { in: ids } },
          select: { id: true, slug: true },
        }, { suppressReporting: true, reason: 'me_page_lookup_org_details_by_ids', source: 'me-page-redirect' })
      );

      meLog('[MePage] Found organization details:', orgs.length, orgs);
      if (!orgs.length) {
        meLog('[MePage] No organization details found for IDs');
        return null;
      }

      const last = await loadCurrentUserLastLocation();
      const lastKey = last?.orgSlug ? String(last.orgSlug) : '';
      meLog('[MePage] Last location orgSlug:', lastKey);
      if (lastKey) {
        const match = orgs.find((o: { id: string; slug: string | null }) => String(o.slug || '') === lastKey || String(o.id) === lastKey);
        if (match) {
          meLog('[MePage] Using last location:', match.slug || match.id);
          return String(match.slug || match.id);
        }
      }

      const primaryId = socialUser.organization_id ? String(socialUser.organization_id) : '';
      meLog('[MePage] Primary organization_id:', primaryId);
      if (primaryId) {
        const match = orgs.find((o: { id: string; slug: string | null }) => String(o.id) === primaryId);
        if (match) {
          meLog('[MePage] Using primary organization:', match.slug || match.id);
          return String(match.slug || match.id);
        }
      }

      const fallback = String(orgs[0].slug || orgs[0].id);
      meLog('[MePage] Using fallback organization:', fallback);
      return fallback;
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
