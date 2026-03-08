'use server';


import { revalidatePath } from 'next/cache';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { getAuthenticatedUser, hasPermission } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';
import { BILLING_PACKAGES, type PackageType } from '@/lib/billing/pricing';
import type { OSModuleKey } from '@/lib/os/modules/types';

export type CustomerAccountRecord = {
  id: string;
  organizationId: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
};

async function requireCurrentOrganizationId(orgSlug: string): Promise<string> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    throw new Error('Not authenticated');
  }

  const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
  return String(workspace.id);
}

function normalizePhone(input: string): string {
  return String(input || '').trim();
}

export async function getCustomerAccountForCurrentOrganization(params: { orgSlug: string }): Promise<{
  success: boolean;
  data?: CustomerAccountRecord | null;
  error?: string;
}> {
  try {
    const organizationId = await requireCurrentOrganizationId(params.orgSlug);

    const row = await prisma.customerAccount.findFirst({
      where: { organizationId: String(organizationId) },
      select: {
        id: true,
        organizationId: true,
        name: true,
        company_name: true,
        phone: true,
        email: true,
      },
    });

    if (!row?.id) return createSuccessResponse(null);

    return createSuccessResponse({
      id: String(row.id),
      organizationId: String(row.organizationId),
      name: String(row.name || ''),
      companyName: row.company_name ? String(row.company_name) : null,
      phone: row.phone ? String(row.phone) : null,
      email: row.email ? String(row.email) : null,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בטעינת פרטי העסק');
  }
}

export async function upsertCustomerAccountForCurrentOrganization(input: {
  orgSlug: string;
  companyName: string;
  phone: string;
  email?: string;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
    const orgSlug = String(input.orgSlug || '').trim();
    if (!orgSlug) {
      return createErrorResponse(null, 'ארגון לא נמצא');
    }
    const companyName = String(input.companyName || '').trim();
    const phone = normalizePhone(input.phone);
    const email = input.email ? String(input.email).trim() : '';

    if (!companyName) {
      return createErrorResponse(null, 'שם עסק חובה');
    }
    if (!phone) {
      return createErrorResponse(null, 'טלפון חובה');
    }
    if (!email) {
      return createErrorResponse(null, 'אימייל חובה');
    }

    const organizationId = await requireCurrentOrganizationId(orgSlug);

    const now = new Date();

    const existing = await prisma.customerAccount.findFirst({
      where: { organizationId: String(organizationId) },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.customerAccount.updateMany({
        where: { id: String(existing.id), organizationId: String(organizationId) },
        data: {
          name: companyName,
          company_name: companyName,
          phone,
          email,
          updated_at: now,
        },
      });
    } else {
      await prisma.customerAccount.create({
        data: {
          organizationId: String(organizationId),
          name: companyName,
          company_name: companyName,
          phone,
          email,
          created_at: now,
          updated_at: now,
        },
      });
    }

    try {
      let canUpdateOrganizationName = false;

      try {
        const user = await getAuthenticatedUser();
        if (user.isSuperAdmin) {
          canUpdateOrganizationName = true;
        } else {
          try {
            const canManageTeam = await hasPermission('manage_team');
            if (canManageTeam) {
              canUpdateOrganizationName = true;
            }
          } catch {
            // ignore
          }

          if (!canUpdateOrganizationName) {
            const [orgRow, memberRow] = await Promise.all([
              prisma.organization.findUnique({
                where: { id: String(organizationId) },
                select: { owner_id: true },
              }),
              prisma.organizationUser.findUnique({
                where: { clerk_user_id: String(user.id) },
                select: { id: true, role: true },
              }),
            ]);

            const ownerId = orgRow?.owner_id ? String(orgRow.owner_id) : '';
            const memberId = memberRow?.id ? String(memberRow.id) : '';
            const memberRole = memberRow?.role ? String(memberRow.role) : '';

            if (ownerId && memberId && ownerId === memberId) {
              canUpdateOrganizationName = true;
            }
          }
        }
      } catch {
        canUpdateOrganizationName = false;
      }

      if (canUpdateOrganizationName) {
        await prisma.organization.update({
          where: { id: String(organizationId) },
          data: { name: companyName, updated_at: now },
        });
      }
    } catch {
      // ignore
    }

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בשמירת פרטי העסק');
  }
}

export async function selectPlanForCurrentOrganization(input: {
  orgSlug: string;
  planKey: string;
  soloModuleKey?: string | null;
  customModules?: string[] | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const orgSlug = String(input.orgSlug || '').trim();
    if (!orgSlug) {
      return createErrorResponse(null, 'ארגון לא נמצא');
    }

    const planKey = String(input.planKey || '').trim();
    if (!planKey || !Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, planKey)) {
      return createErrorResponse(null, 'חבילה לא תקינה');
    }

    const organizationId = await requireCurrentOrganizationId(orgSlug);
    const pkg = BILLING_PACKAGES[planKey as PackageType];

    const validModules: OSModuleKey[] = ['system', 'social', 'client', 'operations', 'nexus'];
    let modules: OSModuleKey[];

    if (planKey === 'custom') {
      const rawCustom = Array.isArray(input.customModules) ? input.customModules : [];
      modules = rawCustom
        .map((m) => String(m || '').trim().toLowerCase() as OSModuleKey)
        .filter((m) => validModules.includes(m));
      if (modules.length === 0) {
        return createErrorResponse(null, 'חבילה מותאמת חייבת לכלול לפחות מודול אחד');
      }
    } else if (planKey === 'solo') {
      const soloMod = String(input.soloModuleKey || '').trim();
      const resolvedMod: OSModuleKey = validModules.includes(soloMod as OSModuleKey)
        ? (soloMod as OSModuleKey)
        : 'system';
      modules = [resolvedMod];
    } else {
      modules = [...pkg.modules];
    }

    const hasModule = (k: OSModuleKey): boolean => modules.includes(k);

    const now = new Date();
    await prisma.organization.update({
      where: { id: String(organizationId) },
      data: {
        subscription_plan: planKey,
        has_nexus: hasModule('nexus'),
        has_system: hasModule('system'),
        has_social: hasModule('social'),
        has_finance: true, // Finance is a free bonus for any paid package
        has_client: hasModule('client'),
        has_operations: hasModule('operations'),
        updated_at: now,
      },
    });

    revalidatePath('/', 'layout');

    return createSuccessResponse(undefined);
  } catch (error: unknown) {
    return createErrorResponse(error, 'שגיאה בבחירת חבילה');
  }
}
