'use server';

import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { withTenantIsolationContext, withPrismaTenantIsolationOverride } from '@/lib/prisma-tenant-guard';

export type OrgDetailRecord = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  owner_id: string;
  is_shabbat_protected: boolean | null;
  is_medical_exempt: boolean;
  has_nexus: boolean | null;
  has_social: boolean | null;
  has_system: boolean | null;
  has_finance: boolean | null;
  has_client: boolean | null;
  has_operations: boolean | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  trial_start_date: string | null;
  trial_days: number | null;
  subscription_start_date: string | null;
  seats_allowed: number | null;
  ai_credits_balance_cents: number;
  created_at: string | null;
  updated_at: string | null;
};

export type OrgMemberRecord = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
};

export type OrgOwnerRecord = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
};

export type OrgSettingsRecord = {
  ai_dna: unknown;
};

export type OrgDetailResult = {
  organization: OrgDetailRecord;
  owner: OrgOwnerRecord | null;
  members: OrgMemberRecord[];
  membersCount: number;
  settings: OrgSettingsRecord | null;
};

async function requireSuperAdmin(): Promise<{ success: true } | { success: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.success) {
    return { success: false, error: authCheck.error || 'נדרשת התחברות' };
  }

  const user = await getAuthenticatedUser();
  if (!user?.isSuperAdmin) {
    return { success: false, error: 'אין הרשאה (נדרש Super Admin)' };
  }

  return { success: true };
}

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function getOrganizationDetail(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OrgDetailResult; error?: string }> {
  return await withTenantIsolationContext(
    { suppressReporting: true, reason: 'admin_org_detail_load', source: 'admin-org-details' },
    async () => {
      try {
        const guard = await requireSuperAdmin();
        if (!guard.success) return guard;

        const organizationId = String(params.organizationId || '').trim();
        if (!organizationId) return createErrorResponse(null, 'חסר מזהה ארגון');

        const orgRow = await prisma.organization.findFirst({
          where: { id: organizationId },
        });

        if (!orgRow) return createErrorResponse(null, 'ארגון לא נמצא');

        const org = {
          id: String(orgRow.id),
          name: String(orgRow.name),
          slug: orgRow.slug == null ? null : String(orgRow.slug),
          logo: orgRow.logo == null ? null : String(orgRow.logo),
          owner_id: String(orgRow.owner_id),
          has_nexus: orgRow.has_nexus,
          has_social: orgRow.has_social,
          has_system: orgRow.has_system,
          has_finance: orgRow.has_finance,
          has_client: orgRow.has_client,
          has_operations: orgRow.has_operations,
          subscription_status: orgRow.subscription_status == null ? null : String(orgRow.subscription_status),
          subscription_plan: orgRow.subscription_plan == null ? null : String(orgRow.subscription_plan),
          trial_start_date: toIsoOrNull(orgRow.trial_start_date),
          trial_days: orgRow.trial_days == null ? null : Number(orgRow.trial_days),
          subscription_start_date: toIsoOrNull(orgRow.subscription_start_date),
          seats_allowed: orgRow.seats_allowed == null ? null : Number(orgRow.seats_allowed),
          ai_credits_balance_cents: Number(orgRow.ai_credits_balance_cents ?? 0),
          is_shabbat_protected: orgRow.is_shabbat_protected ?? null,
          is_medical_exempt: orgRow.is_medical_exempt ?? false,
          created_at: toIsoOrNull(orgRow.created_at),
          updated_at: toIsoOrNull(orgRow.updated_at),
        };

        const { ownerRecord, membersRecords, settingsRecord } = await withTenantIsolationContext(
          {
            suppressReporting: true,
            reason: 'admin_org_detail_hydrate',
            source: 'admin-org-details',
            mode: 'global_admin',
            isSuperAdmin: true,
          },
          async () => {
            const ownerRow = await prisma.organizationUser.findFirst(
              withPrismaTenantIsolationOverride(
                {
                  where: { id: org.owner_id },
                  select: { id: true, clerk_user_id: true, email: true, full_name: true, role: true },
                },
                { suppressReporting: true, reason: 'admin_org_detail_owner', source: 'admin-org-details', mode: 'global_admin', isSuperAdmin: true }
              )
            );

            const ownerRecord: OrgOwnerRecord | null = ownerRow
              ? {
                  id: String(ownerRow.id),
                  clerk_user_id: String(ownerRow.clerk_user_id),
                  email: ownerRow.email == null ? null : String(ownerRow.email),
                  full_name: ownerRow.full_name == null ? null : String(ownerRow.full_name),
                  role: ownerRow.role == null ? null : String(ownerRow.role),
                }
              : null;

            const membersRows = await prisma.organizationUser.findMany(
              withPrismaTenantIsolationOverride(
                {
                  where: { organization_id: organizationId },
                  select: { id: true, clerk_user_id: true, email: true, full_name: true, role: true, created_at: true },
                  orderBy: { created_at: 'desc' as const },
                  take: 200,
                },
                { suppressReporting: true, reason: 'admin_org_detail_members', source: 'admin-org-details', mode: 'global_admin', isSuperAdmin: true }
              )
            );

            const membersRecords: OrgMemberRecord[] = (membersRows || []).map((m) => ({
              id: String(m.id),
              clerk_user_id: String(m.clerk_user_id),
              email: m.email == null ? null : String(m.email),
              full_name: m.full_name == null ? null : String(m.full_name),
              role: m.role == null ? null : String(m.role),
              created_at: toIsoOrNull(m.created_at),
            }));

            let settingsRecord: OrgSettingsRecord | null = null;
            try {
              const settings = await prisma.organization_settings.findFirst({
                where: { organization_id: organizationId },
                select: { ai_dna: true },
              });
              if (settings) {
                settingsRecord = {
                  ai_dna: settings.ai_dna,
                };
              }
            } catch {
              // ignore - settings table might not exist for this org
            }

            return { ownerRecord, membersRecords, settingsRecord };
          }
        );

        const orgDetail: OrgDetailRecord = {
          id: String(org.id),
          name: String(org.name),
          slug: org.slug == null ? null : String(org.slug),
          logo: org.logo == null ? null : String(org.logo),
          owner_id: String(org.owner_id),
          is_shabbat_protected: org.is_shabbat_protected ?? null,
          is_medical_exempt: org.is_medical_exempt ?? false,
          has_nexus: org.has_nexus,
          has_social: org.has_social,
          has_system: org.has_system,
          has_finance: org.has_finance,
          has_client: org.has_client,
          has_operations: org.has_operations,
          subscription_status: org.subscription_status == null ? null : String(org.subscription_status),
          subscription_plan: org.subscription_plan == null ? null : String(org.subscription_plan),
          trial_start_date: toIsoOrNull(org.trial_start_date),
          trial_days: org.trial_days == null ? null : Number(org.trial_days),
          subscription_start_date: toIsoOrNull(org.subscription_start_date),
          seats_allowed: org.seats_allowed == null ? null : Number(org.seats_allowed),
          ai_credits_balance_cents: Number(org.ai_credits_balance_cents ?? 0),
          created_at: toIsoOrNull(org.created_at),
          updated_at: toIsoOrNull(org.updated_at),
        };

        return createSuccessResponse({
          organization: orgDetail,
          owner: ownerRecord,
          members: membersRecords,
          membersCount: membersRecords.length,
          settings: settingsRecord,
        });
      } catch (error) {
        return createErrorResponse(error, 'שגיאה בטעינת פרטי ארגון');
      }
    }
  );
}
