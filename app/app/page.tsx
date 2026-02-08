import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation, requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
export const dynamic = 'force-dynamic';

 async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
   let timeoutId: ReturnType<typeof setTimeout> | null = null;
   const timeout = new Promise<never>((_, reject) => {
     timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
   });
   try {
     return (await Promise.race([promise, timeout])) as T;
   } finally {
     if (timeoutId) clearTimeout(timeoutId);
   }
 }

export default async function AppEntryPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login?redirect=/app');
  }

  try {
    const last = await withTimeout(loadCurrentUserLastLocation(), 8000, 'loadCurrentUserLastLocation');
    if (!last.orgSlug) {
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let socialUser = await withTimeout(
        prisma.organizationUser.findUnique({
          where: { clerk_user_id: userId },
          select: { id: true, organization_id: true },
        }),
        8000,
        'prisma.organizationUser.findUnique'
      );

      if (!socialUser?.id) {
        await sleep(1000);
        socialUser = await withTimeout(
          prisma.organizationUser.findUnique({
            where: { clerk_user_id: userId },
            select: { id: true, organization_id: true },
          }),
          8000,
          'prisma.organizationUser.findUnique(retry)'
        );
      }

      if (!socialUser?.id) {
        redirect('/workspaces');
      }

      const orgIds = new Set<string>();
      if (socialUser.organization_id) {
        orgIds.add(String(socialUser.organization_id));
      }

      const ownedOrgs = await withTimeout(
        prisma.organization.findMany({
          where: { owner_id: String(socialUser.id) },
          select: { id: true },
        }),
        8000,
        'prisma.organization.findMany(owned)'
      );

      for (const org of ownedOrgs || []) {
        if (org?.id) orgIds.add(String(org.id));
      }

      const memberships = await withTimeout(
        prisma.teamMember.findMany({
          where: { user_id: String(socialUser.id) },
          select: { organization_id: true },
        }),
        8000,
        'prisma.teamMember.findMany'
      );

      for (const row of memberships || []) {
        if (row.organization_id) orgIds.add(String(row.organization_id));
      }

      const ids = Array.from(orgIds);
      if (ids.length === 1) {
        const onlyOrgId = ids[0];
        const org = await withTimeout(
          prisma.organization.findUnique({
            where: { id: String(onlyOrgId) },
            select: { id: true, slug: true },
          }),
          8000,
          'prisma.organization.findUnique'
        );

        const onlyOrgSlug = String(org?.slug || org?.id || onlyOrgId);
        redirect(`/w/${encodeURIComponent(onlyOrgSlug)}`);
      }

      redirect('/workspaces');
    }

    const workspace = await withTimeout(
      requireWorkspaceAccessByOrgSlug(last.orgSlug),
      8000,
      'requireWorkspaceAccessByOrgSlug'
    );

    if (last.module && workspace.entitlements[last.module]) {
      redirect(`/w/${encodeURIComponent(last.orgSlug)}/${last.module}`);
    }

    // If we don't have a valid last module, send the user to the workspace entry.
    // That page will choose (last module / single allowed / lobby).
    redirect(`/w/${encodeURIComponent(last.orgSlug)}`);
  } catch (error) {
    console.error('[AppEntryPage] bootstrap failed, falling back to /workspaces:', error);
    redirect('/workspaces');
  }
}

 export const runtime = 'nodejs';
