'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { isTenantAdminRole } from '@/lib/constants/roles';

/**
 * Save a logo reference (sb:// URI) to the workspace's organization row.
 * Requires the caller to be the org owner or an admin-level role.
 *
 * NOTE: Organization model has no organizationId field — it IS the tenant.
 * The tenant guard skips it automatically for Organization queries.
 * requireWorkspaceAccessByOrgSlug sets the tenant context; all subsequent
 * queries on scoped models (e.g. OrganizationUser) MUST include
 * organization_id in the where clause.
 */
export async function saveWorkspaceLogo(params: {
  orgSlug: string;
  logoRef: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) return { ok: false, error: 'Unauthorized' };

    // requireWorkspaceAccessByOrgSlug already sets tenant context with organizationId.
    // All subsequent queries on scoped models MUST include organization_id in where.

    // Parallelize the two authorization queries
    const [dbUser, org] = await Promise.all([
      prisma.organizationUser.findFirst({
        where: { clerk_user_id: clerkUserId, organization_id: workspace.id },
        select: { id: true, role: true },
      }),
      prisma.organization.findUnique({
        where: { id: workspace.id },
        select: { owner_id: true },
      }),
    ]);

    if (!dbUser) return { ok: false, error: 'Forbidden' };

    const isOwner = org?.owner_id && String(org.owner_id) === String(dbUser.id);
    const isAdmin = isTenantAdminRole(dbUser.role);

    if (!isOwner && !isAdmin) {
      return { ok: false, error: 'רק הבעלים או אדמין יכולים לעדכן את הלוגו' };
    }

    // Direct update — Organization model doesn't need tenant scoping
    await prisma.organization.update({
      where: { id: workspace.id },
      data: {
        logo: params.logoRef || null,
        updated_at: new Date(),
      },
    });

    return { ok: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[saveWorkspaceLogo]', msg, error);
    return { ok: false, error: 'שגיאה בשמירת הלוגו' };
  }
}
