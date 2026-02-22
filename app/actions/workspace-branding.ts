'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { isTenantAdminRole } from '@/lib/constants/roles';

/**
 * Save a logo reference (sb:// URI) to the workspace's organization row.
 * Requires the caller to be the org owner or an admin-level role.
 */
export async function saveWorkspaceLogo(params: {
  orgSlug: string;
  logoRef: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) return { ok: false, error: 'Unauthorized' };

    // Check the caller is org owner or admin
    const dbUser = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { id: true, organization_id: true, role: true },
    });

    if (!dbUser) return { ok: false, error: 'Forbidden' };

    const org = await prisma.organization.findUnique({
      where: { id: workspace.id },
      select: { owner_id: true },
    });

    const isOwner = org?.owner_id && String(org.owner_id) === String(dbUser.id);
    const isAdmin = isTenantAdminRole(dbUser.role);

    if (!isOwner && !isAdmin) {
      return { ok: false, error: 'רק הבעלים או אדמין יכולים לעדכן את הלוגו' };
    }

    await withTenantIsolationContext(
      {
        source: 'actions/workspace-branding.saveWorkspaceLogo',
        reason: 'owner_update_logo',
        mode: 'default',
        organizationId: workspace.id,
      },
      async () => {
        await prisma.organization.update({
          where: { id: workspace.id },
          data: {
            logo: params.logoRef || null,
            updated_at: new Date(),
          },
        });
      },
    );

    // DEBUG: verify logo was saved (temporary — remove after fix)
    const verify = await prisma.organization.findUnique({
      where: { id: workspace.id },
      select: { logo: true },
    });
    console.log('[saveWorkspaceLogo] saved logoRef:', params.logoRef, '| DB now has:', verify?.logo);

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error: unknown) {
    console.error('[saveWorkspaceLogo]', error);
    return { ok: false, error: 'שגיאה בשמירת הלוגו' };
  }
}
