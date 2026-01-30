'use server';

import { createClient } from '@/lib/supabase';
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
    const supabase = createClient();

    const { data: row } = await supabase
      .from('customer_accounts')
      .select('id, organization_id, name, company_name, phone, email')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!row?.id) {
      return createSuccessResponse(null);
    }

    const mapped: CustomerAccountRecord = {
      id: String((row as any).id),
      organizationId: String((row as any).organization_id),
      name: String((row as any).name || ''),
      companyName: (row as any).company_name ? String((row as any).company_name) : null,
      phone: (row as any).phone ? String((row as any).phone) : null,
      email: (row as any).email ? String((row as any).email) : null,
    };

    return createSuccessResponse(mapped);
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

    const supabase = createClient();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('customer_accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('customer_accounts')
        .update({
          name: companyName,
          company_name: companyName,
          phone,
          email,
          updated_at: now,
        } as any)
        .eq('id', String(existing.id));

      if (updateError) {
        return createErrorResponse(updateError, 'שגיאה בעדכון פרטי העסק');
      }
    } else {
      const { error: insertError } = await supabase
        .from('customer_accounts')
        .insert({
          organization_id: organizationId,
          name: companyName,
          company_name: companyName,
          phone,
          email,
          created_at: now,
          updated_at: now,
        } as any);

      if (insertError) {
        return createErrorResponse(insertError, 'שגיאה בשמירת פרטי העסק');
      }
    }

    await supabase
      .from('organizations')
      .update({ name: companyName, updated_at: now } as any)
      .eq('id', organizationId);

    return createSuccessResponse(true);
  } catch (error: any) {
    return createErrorResponse(error, error?.message || 'שגיאה בשמירת פרטי העסק');
  }
}
