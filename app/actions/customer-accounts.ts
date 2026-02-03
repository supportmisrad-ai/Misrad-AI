'use server';

import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { provisionCurrentUserWorkspaceAction } from '@/app/actions/users';
import prisma from '@/lib/prisma';

export type CustomerAccountRecord = {
  id: string;
  organizationId: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
};

async function requireCurrentOrganizationId(): Promise<string> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    throw new Error('Not authenticated');
  }

  const profile = await prisma.profile.findFirst({
    where: { clerkUserId },
    select: { organizationId: true },
  });

  const existingOrgId = profile?.organizationId ?? null;
  if (existingOrgId) {
    return String(existingOrgId);
  }

  const provision = await provisionCurrentUserWorkspaceAction();
  if (!provision.success) {
    throw new Error(provision.error || 'Failed to provision workspace');
  }

  const profileAfter = await prisma.profile.findFirst({
    where: { clerkUserId },
    select: { organizationId: true },
  });

  const orgIdAfter = profileAfter?.organizationId ?? null;
  if (!orgIdAfter) {
    throw new Error('Missing organization for current user');
  }

  return String(orgIdAfter);
}

function normalizePhone(input: string): string {
  return String(input || '').trim();
}

export async function getCustomerAccountForCurrentOrganization(): Promise<{
  success: boolean;
  data?: CustomerAccountRecord | null;
  error?: string;
}> {
  try {
    const organizationId = await requireCurrentOrganizationId();

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
  } catch (error: any) {
    return createErrorResponse(error, error?.message || 'שגיאה בטעינת פרטי העסק');
  }
}

export async function upsertCustomerAccountForCurrentOrganization(input: {
  companyName: string;
  phone: string;
  email?: string;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
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

    const organizationId = await requireCurrentOrganizationId();

    const now = new Date();

    const existing = await prisma.customerAccount.findFirst({
      where: { organizationId: String(organizationId) },
      select: { id: true },
    });

    if (existing?.id) {
      await prisma.customerAccount.update({
        where: { id: String(existing.id) },
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
      await prisma.social_organizations.update({
        where: { id: String(organizationId) },
        data: { name: companyName, updated_at: now },
      });
    } catch {
      // ignore
    }

    const provision = await provisionCurrentUserWorkspaceAction();
    if (!provision.success) {
      return createErrorResponse(provision.error || 'Failed to provision workspace');
    }

    return createSuccessResponse(true);
  } catch (error: any) {
    return createErrorResponse(error, error?.message || 'שגיאה בשמירת פרטי העסק');
  }
}
