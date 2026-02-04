import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation } from '@/lib/server/workspace';
import { getAuthenticatedUser } from '@/lib/auth';

// Force dynamic rendering as this page depends on authentication
export const dynamic = 'force-dynamic';

async function resolveRedirectWorkspaceSlugForCurrentUser(): Promise<string | null> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) return null;

  const socialUser = await prisma.social_users.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: { id: true, organization_id: true },
  });

  if (!socialUser?.id) return null;

  const orgIds = new Set<string>();

  if (socialUser.organization_id) {
    orgIds.add(String(socialUser.organization_id));
  }

  const ownedOrgs = await prisma.social_organizations.findMany({
    where: { owner_id: String(socialUser.id) },
    select: { id: true },
  });

  for (const row of ownedOrgs) {
    if (row?.id) orgIds.add(String(row.id));
  }

  const memberships = await prisma.social_team_members.findMany({
    where: { user_id: String(socialUser.id) },
    select: { organization_id: true },
  });

  for (const row of memberships) {
    if (row?.organization_id) orgIds.add(String(row.organization_id));
  }

  const ids = Array.from(orgIds);
  if (!ids.length) return null;

  const orgs = await prisma.social_organizations.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true },
  });

  if (!orgs.length) return null;

  const last = await loadCurrentUserLastLocation();
  const lastKey = last?.orgSlug ? String(last.orgSlug) : '';
  if (lastKey) {
    const match = orgs.find((o) => String(o.slug || '') === lastKey || String(o.id) === lastKey);
    if (match) return String(match.slug || match.id);
  }

  const primaryId = socialUser.organization_id ? String(socialUser.organization_id) : '';
  if (primaryId) {
    const match = orgs.find((o) => String(o.id) === primaryId);
    if (match) return String(match.slug || match.id);
  }

  return String(orgs[0].slug || orgs[0].id);
}

export default async function MePage() {
  // Smart routing: authenticated users go to their workspace
  // Non-authenticated users go to login
  const clerkUserId = await getCurrentUserId();
  
  if (!clerkUserId) {
    // Not logged in -> redirect to sign in
    redirect('/sign-in');
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
