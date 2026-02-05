import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation } from '@/lib/server/workspace';
import { getAuthenticatedUser } from '@/lib/auth';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

// Force dynamic rendering as this page depends on authentication
export const dynamic = 'force-dynamic';

async function resolveRedirectWorkspaceSlugForCurrentUser(): Promise<string | null> {
  return await withTenantIsolationContext(
    { suppressReporting: true, source: 'me-page-redirect' },
    async () => {
      const clerkUserId = await getCurrentUserId();
      if (!clerkUserId) {
        console.log('[MePage] No clerkUserId found');
        return null;
      }

      console.log('[MePage] Looking up social_user for clerkUserId:', clerkUserId);
      const socialUser = await prisma.social_users.findUnique(
        withPrismaTenantIsolationOverride({
          where: { clerk_user_id: clerkUserId },
          select: { id: true, organization_id: true },
        }, { suppressReporting: true })
      );

      console.log('[MePage] social_user found:', socialUser ? 'YES' : 'NO', socialUser);

      if (!socialUser?.id) {
        console.log('[MePage] No social_user record found for clerkUserId:', clerkUserId);
        return null;
      }

      const orgIds = new Set<string>();

      if (socialUser.organization_id) {
        orgIds.add(String(socialUser.organization_id));
        console.log('[MePage] Added primary organization_id:', socialUser.organization_id);
      }

      console.log('[MePage] Looking for owned organizations for user:', socialUser.id);
      const ownedOrgs = await prisma.social_organizations.findMany(
        withPrismaTenantIsolationOverride({
          where: { owner_id: String(socialUser.id) },
          select: { id: true },
        }, { suppressReporting: true })
      );

      console.log('[MePage] Found owned organizations:', ownedOrgs.length);
      for (const row of ownedOrgs) {
        if (row?.id) {
          orgIds.add(String(row.id));
          console.log('[MePage] Added owned organization_id:', row.id);
        }
      }

      console.log('[MePage] Looking for team memberships for user:', socialUser.id);
      const memberships = await prisma.social_team_members.findMany(
        withPrismaTenantIsolationOverride({
          where: { user_id: String(socialUser.id) },
          select: { organization_id: true },
        }, { suppressReporting: true })
      );

      console.log('[MePage] Found team memberships:', memberships.length);
      for (const row of memberships) {
        if (row?.organization_id) {
          orgIds.add(String(row.organization_id));
          console.log('[MePage] Added membership organization_id:', row.organization_id);
        }
      }

      const ids = Array.from(orgIds);
      console.log('[MePage] Total organization IDs found:', ids.length, ids);
      if (!ids.length) {
        console.log('[MePage] No organizations found for user');
        return null;
      }

      console.log('[MePage] Looking up organization details for IDs:', ids);
      const orgs = await prisma.social_organizations.findMany(
        withPrismaTenantIsolationOverride({
          where: { id: { in: ids } },
          select: { id: true, slug: true },
        }, { suppressReporting: true })
      );

      console.log('[MePage] Found organization details:', orgs.length, orgs);
      if (!orgs.length) {
        console.log('[MePage] No organization details found for IDs');
        return null;
      }

      const last = await loadCurrentUserLastLocation();
      const lastKey = last?.orgSlug ? String(last.orgSlug) : '';
      console.log('[MePage] Last location orgSlug:', lastKey);
      if (lastKey) {
        const match = orgs.find((o) => String(o.slug || '') === lastKey || String(o.id) === lastKey);
        if (match) {
          console.log('[MePage] Using last location:', match.slug || match.id);
          return String(match.slug || match.id);
        }
      }

      const primaryId = socialUser.organization_id ? String(socialUser.organization_id) : '';
      console.log('[MePage] Primary organization_id:', primaryId);
      if (primaryId) {
        const match = orgs.find((o) => String(o.id) === primaryId);
        if (match) {
          console.log('[MePage] Using primary organization:', match.slug || match.id);
          return String(match.slug || match.id);
        }
      }

      const fallback = String(orgs[0].slug || orgs[0].id);
      console.log('[MePage] Using fallback organization:', fallback);
      return fallback;
    }
  );
}

export default async function MePage() {
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
    redirect(`/w/${encodeURIComponent(orgSlug)}`);
  }

  // No workspace found -> go to workspaces page
  redirect('/workspaces');
}
