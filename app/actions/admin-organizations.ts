'use server';



import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/server/logger';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendOrganizationWelcomeEmail } from '@/lib/email';
import { DEFAULT_TRIAL_DAYS } from '@/lib/trial';
import { generateOrgSlug, generateUniqueOrgSlug } from '@/lib/server/orgSlug';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { getUnknownErrorMessage } from '@/lib/shared/unknown';
import { Prisma } from '@prisma/client';

type OrganizationCreateData = Parameters<typeof prisma.organization.create>[0]['data'];
type OrganizationUpdateManyData = Parameters<typeof prisma.organization.updateMany>[0]['data'];
type UserUpdateManyData = Parameters<typeof prisma.organizationUser.updateMany>[0]['data'];
type OrgSignupInvitationCreateData = Parameters<typeof prisma.organization_signup_invitations.create>[0]['data'];

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  owner_id: string;
  is_shabbat_protected?: boolean | null;
  has_nexus: boolean | null;
  has_social: boolean | null;
  has_system: boolean | null;
  has_finance: boolean | null;
  has_client: boolean | null;
  has_operations: boolean | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  trial_start_date: string | Date | null;
  trial_days: number | null;
  subscription_start_date: string | Date | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  client_id?: string | null;
  businessClientName?: string | null;
};

export type UserLite = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  organization_id: string | null;
};

export type SocialUserLite = UserLite;

export type OrganizationWithOwner = OrganizationRecord & {
  owner?: Pick<UserLite, 'id' | 'email' | 'full_name' | 'clerk_user_id' | 'role'> | null;
  membersCount?: number;
  primaryClientId?: string | null;
  client_id?: string | null;
  businessClientName?: string | null;
};

function normalizeEmail(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase();
}

async function generateUniqueOrgInviteToken(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const token = randomBytes(16).toString('hex').toUpperCase().slice(0, 32);
    const existing = await prisma.organization_signup_invitations.findFirst({
      where: { token },
      select: { id: true },
    });

    if (!existing) return token;
  }

  throw new Error('Failed to generate invite token');
}

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

export async function getOrganizations(params?: {
  query?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: OrganizationWithOwner[]; error?: string }> {
  return await withTenantIsolationContext(
    { suppressReporting: true, reason: 'admin_organizations_load', source: 'admin-organizations' },
    async () => {
      try {
        const guard = await requireSuperAdmin();
        if (!guard.success) return guard;
        const query = (params?.query || '').trim();
        const limit = Math.min(Math.max(params?.limit || 200, 1), 500);

        const orgs = await prisma.organization.findMany({
          where: {
            deleted_at: null,
            ...(query
              ? {
                  OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { slug: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            owner_id: true,
            is_shabbat_protected: true,
            is_medical_exempt: true,
            has_nexus: true,
            has_social: true,
            has_system: true,
            has_finance: true,
            has_client: true,
            has_operations: true,
            subscription_status: true,
            subscription_plan: true,
            trial_start_date: true,
            trial_days: true,
            subscription_start_date: true,
            created_at: true,
            updated_at: true,
            client_id: true,
          },
          orderBy: { created_at: 'desc' },
          take: limit,
        });

        const ownerIds = Array.from(new Set((orgs || []).map((o) => o.owner_id).filter(Boolean)));

        const { ownersById, membersCountByOrg, primaryClientByOrgId, businessClientNameById } = await withTenantIsolationContext(
          {
            suppressReporting: true,
            reason: 'admin_organizations_hydrate_owners_and_counts',
            source: 'admin-organizations',
            mode: 'global_admin',
            isSuperAdmin: true,
          },
          async () => {
            const orgIds = (orgs || []).map((o) => o.id);
            const clientIds = (orgs || []).map((o) => o.client_id).filter((id): id is string => Boolean(id));

            const [ownersRaw, groupRaw, primaryClientsRaw, bizClientsRaw] = await Promise.all([
              ownerIds.length
                ? prisma.organizationUser.findMany(
                    withPrismaTenantIsolationOverride({
                      where: { id: { in: ownerIds as string[] } },
                      select: { id: true, email: true, full_name: true, clerk_user_id: true, role: true },
                    }, { suppressReporting: true, reason: 'admin_organizations_lookup_owners_by_id_list', source: 'admin-organizations', mode: 'global_admin', isSuperAdmin: true })
                  )
                : Promise.resolve([]),

              orgIds.length
                ? prisma.organizationUser.groupBy(
                    withPrismaTenantIsolationOverride({
                      by: ['organization_id'],
                      where: { organization_id: { in: orgIds } },
                      _count: { _all: true },
                    }, { suppressReporting: true, reason: 'admin_organizations_group_members_count_by_org', source: 'admin-organizations', mode: 'global_admin', isSuperAdmin: true })
                  )
                : Promise.resolve([]),

              orgIds.length
                ? prisma.clientClient.findMany(
                    withPrismaTenantIsolationOverride(
                      {
                        where: { organizationId: { in: orgIds } },
                        select: { id: true, organizationId: true },
                        orderBy: [{ organizationId: Prisma.SortOrder.asc }, { createdAt: Prisma.SortOrder.asc }],
                        distinct: [Prisma.ClientClientScalarFieldEnum.organizationId],
                        take: orgIds.length,
                      },
                      { suppressReporting: true, reason: 'admin_organizations_primary_client_by_org', source: 'admin-organizations', mode: 'global_admin', isSuperAdmin: true }
                    )
                  )
                : Promise.resolve([]),

              clientIds.length
                ? prisma.businessClient.findMany(
                    withPrismaTenantIsolationOverride(
                      { where: { id: { in: clientIds } }, select: { id: true, company_name: true } },
                      { suppressReporting: true, reason: 'admin_organizations_biz_client_names', source: 'admin-organizations', mode: 'global_admin', isSuperAdmin: true }
                    )
                  )
                : Promise.resolve([]),
            ]);

            const ownersById: Record<string, { id: string; email: string | null; full_name: string | null; clerk_user_id: string; role: string | null }> = {};
            for (const o of ownersRaw || []) {
              ownersById[String(o.id)] = {
                id: String(o.id),
                email: o.email == null ? null : String(o.email),
                full_name: o.full_name == null ? null : String(o.full_name),
                clerk_user_id: String(o.clerk_user_id),
                role: o.role == null ? null : String(o.role),
              };
            }

            const membersCountByOrg: Record<string, number> = {};
            for (const g of groupRaw || []) {
              const key = String(g.organization_id || '');
              if (!key) continue;
              membersCountByOrg[key] = Number(g._count?._all || 0);
            }

            const primaryClientByOrgId: Record<string, string> = {};
            for (const c of primaryClientsRaw || []) {
              const orgId = c.organizationId ? String(c.organizationId) : '';
              const clientId = c.id ? String(c.id) : '';
              if (!orgId || !clientId) continue;
              primaryClientByOrgId[orgId] = clientId;
            }

            const businessClientNameById: Record<string, string> = {};
            for (const bc of bizClientsRaw || []) {
              businessClientNameById[String(bc.id)] = String(bc.company_name);
            }

            return { ownersById, membersCountByOrg, primaryClientByOrgId, businessClientNameById };
          }
        );

        function toIsoOrNull(value: unknown): string | null {
          if (!value) return null;
          if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
          const d = new Date(String(value));
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        }

        const enriched: OrganizationWithOwner[] = (orgs || []).map((o: {
          id: string;
          name: string;
          slug: string | null;
          logo: string | null;
          owner_id: string;
          is_shabbat_protected: boolean | null;
          has_nexus: boolean | null;
          has_social: boolean | null;
          has_system: boolean | null;
          has_finance: boolean | null;
          has_client: boolean | null;
          has_operations: boolean | null;
          subscription_status: string | null;
          subscription_plan: string | null;
          trial_start_date: Date | null;
          trial_days: number | null;
          subscription_start_date: Date | null;
          created_at: Date | null;
          updated_at: Date | null;
          client_id?: string | null;
        }) => ({
          id: String(o.id),
          name: String(o.name),
          slug: o.slug == null ? null : String(o.slug),
          logo: o.logo == null ? null : String(o.logo),
          owner_id: String(o.owner_id),
          is_shabbat_protected: o.is_shabbat_protected,
          has_nexus: o.has_nexus,
          has_social: o.has_social,
          has_system: o.has_system,
          has_finance: o.has_finance,
          has_client: o.has_client,
          has_operations: o.has_operations,
          subscription_status: o.subscription_status == null ? null : String(o.subscription_status),
          subscription_plan: o.subscription_plan == null ? null : String(o.subscription_plan),
          trial_start_date: toIsoOrNull(o.trial_start_date),
          trial_days: o.trial_days == null ? null : Number(o.trial_days),
          subscription_start_date: toIsoOrNull(o.subscription_start_date),
          created_at: toIsoOrNull(o.created_at),
          updated_at: toIsoOrNull(o.updated_at),
          owner: ownersById[o.owner_id] || null,
          membersCount: membersCountByOrg[o.id] || 0,
          primaryClientId: primaryClientByOrgId[String(o.id)] || null,
          client_id: o.client_id ?? null,
          businessClientName: o.client_id ? (businessClientNameById[o.client_id] ?? null) : null,
        }));

        return createSuccessResponse(enriched);
      } catch (error) {
        return createErrorResponse(error, 'שגיאה בטעינת ארגונים');
      }
    }
  );
}

export async function getOrganizationMembersLite(params: {
  organizationId: string;
  query?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: UserLite[]; error?: string }> {
  return await withTenantIsolationContext(
    { suppressReporting: true, reason: 'admin_organization_members_lite_load', source: 'admin-organizations' },
    async () => {
      try {
        const guard = await requireSuperAdmin();
        if (!guard.success) return guard;

        const organizationId = String(params.organizationId || '').trim();
        if (!organizationId) return createErrorResponse(null, 'חסר organizationId');

        const query = String(params.query || '').trim();
        const limit = Math.min(Math.max(Number(params.limit ?? 200), 1), 500);

        const rows = await withTenantIsolationContext(
          {
            suppressReporting: true,
            reason: 'admin_organization_members_lite_query_global_admin',
            source: 'admin-organizations',
            mode: 'global_admin',
            isSuperAdmin: true,
          },
          async () => {
            return await prisma.organizationUser.findMany(
              withPrismaTenantIsolationOverride({
                where: {
                  organization_id: organizationId,
                  ...(query
                    ? {
                        OR: [
                          { email: { contains: query, mode: 'insensitive' as const } },
                          { full_name: { contains: query, mode: 'insensitive' as const } },
                          { clerk_user_id: { contains: query, mode: 'insensitive' as const } },
                        ],
                      }
                    : {}),
                },
                select: { id: true, clerk_user_id: true, email: true, full_name: true, role: true, organization_id: true },
                orderBy: { created_at: 'desc' as const },
                take: limit,
              }, { suppressReporting: true, reason: 'admin_organization_members_lite_list', source: 'admin-organizations', mode: 'global_admin', isSuperAdmin: true })
            );
          }
        );

        return createSuccessResponse(rows || []);
      } catch (error) {
        return createErrorResponse(error, 'שגיאה בטעינת משתמשי ארגון');
      }
    }
  );
}

export async function getUsersLite(params?: {
  query?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: UserLite[]; error?: string }> {
  return await withTenantIsolationContext(
    { suppressReporting: true, reason: 'admin_users_lite_load', source: 'admin-social-users-lite' },
    async () => {
      try {
        const guard = await requireSuperAdmin();
        if (!guard.success) return guard;
        const query = (params?.query || '').trim();
        const limit = Math.min(Math.max(params?.limit || 200, 1), 500);

        const data = await withTenantIsolationContext(
          {
            suppressReporting: true,
            reason: 'admin_users_lite_query_global_admin',
            source: 'admin-social-users-lite',
            mode: 'global_admin',
            isSuperAdmin: true,
          },
          async () => {
            return await prisma.organizationUser.findMany(
              withPrismaTenantIsolationOverride({
                where: query
                  ? {
                      OR: [
                        { email: { contains: query, mode: 'insensitive' as const } },
                        { full_name: { contains: query, mode: 'insensitive' as const } },
                        { clerk_user_id: { contains: query, mode: 'insensitive' as const } },
                      ],
                    }
                  : undefined,
                select: { id: true, clerk_user_id: true, email: true, full_name: true, role: true, organization_id: true },
                orderBy: { created_at: 'desc' as const },
                take: limit,
              }, { suppressReporting: true, reason: 'admin_social_users_lite_list', source: 'admin-social-users-lite', mode: 'global_admin', isSuperAdmin: true })
            );
          }
        );

        return createSuccessResponse(data || []);
      } catch (error) {
        return createErrorResponse(error, 'שגיאה בטעינת משתמשים');
      }
    }
  );
}

export async function getSocialUsersLite(params?: {
  query?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: SocialUserLite[]; error?: string }> {
  return await getUsersLite(params);
}

export async function createOrganization(input: {
  name: string;
  slug: string;
  ownerUserId: string;
  has_nexus?: boolean;
  has_social?: boolean;
  has_system?: boolean;
  has_finance?: boolean;
  has_client?: boolean;
  has_operations?: boolean;
  subscription_status?: string;
  subscription_plan?: string;
  trial_days?: number;
}): Promise<{ success: boolean; data?: { organizationId: string }; error?: string }> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const name = (input.name || '').trim();
    if (!name) return createErrorResponse(null, 'שם ארגון חובה');

    const ownerUserId = (input.ownerUserId || '').trim();
    if (!ownerUserId) return createErrorResponse(null, 'בעלים (ownerUserId) חובה');

    const baseSlug = generateOrgSlug(input.slug);
    if (!baseSlug) return createErrorResponse(null, 'Slug לא תקין');

    const finalSlug = await generateUniqueOrgSlug(baseSlug);

    const now = new Date();

    const createdOrg = await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'admin_create_organization',
        source: 'admin-organizations',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        const createdOrg = await prisma.organization.create({
          data: {
            name,
            slug: finalSlug,
            owner_id: ownerUserId,
            has_nexus: input.has_nexus ?? true,
            has_social: input.has_social ?? false,
            has_system: input.has_system ?? false,
            has_finance: input.has_finance ?? false,
            has_client: input.has_client ?? false,
            has_operations: input.has_operations ?? false,
            subscription_status: input.subscription_status ?? 'trial',
            subscription_plan: input.subscription_plan ?? null,
            trial_start_date: now,
            trial_days: input.trial_days ?? DEFAULT_TRIAL_DAYS,
            created_at: now,
            updated_at: now,
          } satisfies OrganizationCreateData,
          select: { id: true },
        });

        await prisma.organizationUser.updateMany({
          where: { id: ownerUserId },
          data: { organization_id: createdOrg.id, updated_at: now } satisfies UserUpdateManyData,
        });

        const owner = await prisma.organizationUser.findFirst({
          where: { id: ownerUserId },
          select: { email: true, full_name: true },
        });

        return createdOrg;
      }
    );

    // Best-effort: auto-create BusinessClient for the new org
    try {
      const { ensureBusinessClientForOrg } = await import('@/app/actions/business-clients');
      await ensureBusinessClientForOrg(createdOrg.id);
    } catch (e) {
      logger.error('createOrganization', 'ensureBusinessClientForOrg failed (ignored)', e);
    }

    // Best-effort: send welcome email with portal link
    try {
      const ownerData = await prisma.organizationUser.findFirst({
        where: { id: ownerUserId },
        select: { email: true, full_name: true },
      });

      const ownerEmail = ownerData?.email ? String(ownerData.email) : null;
      if (ownerEmail) {
        const baseUrl = getBaseUrl();
        const portalSlug = finalSlug || createdOrg.id;
        const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalSlug))}`;
        await sendOrganizationWelcomeEmail({
          ownerEmail,
          organizationName: name,
          ownerName: ownerData?.full_name ? String(ownerData.full_name) : null,
          portalUrl,
        });
      }
    } catch (e) {
      logger.error('createOrganization', 'welcome email failed (ignored)', e);
    }

    revalidatePath('/', 'layout');

    return createSuccessResponse({ organizationId: createdOrg.id });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה ביצירת ארגון');
  }
}

export async function createOrganizationOrInviteOwner(input: {
  name: string;
  slug: string;
  ownerEmail: string;
  packageType?: string | null;
  modules?: string[] | null;
  businessClientId?: string | null;
}): Promise<
  | { success: true; data: { kind: 'organization'; organizationId: string } }
  | { success: true; data: { kind: 'invitation'; token: string; signupUrl: string } }
  | { success: false; error: string }
> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const name = (input.name || '').trim();
    if (!name) return { success: false, error: createErrorResponse(null, 'שם ארגון חובה').error || 'שם ארגון חובה' };

    const desiredSlug = generateOrgSlug(input.slug || '');
    if (!desiredSlug) return { success: false, error: createErrorResponse(null, 'Slug לא תקין').error || 'Slug לא תקין' };

    const ownerEmail = normalizeEmail(input.ownerEmail || '');
    if (!ownerEmail || !ownerEmail.includes('@')) {
      return { success: false, error: createErrorResponse(null, 'אימייל בעלים לא תקין').error || 'אימייל בעלים לא תקין' };
    }

    const existingOrgBySlug = await prisma.organization.findFirst(
      withPrismaTenantIsolationOverride(
        {
          where: { slug: desiredSlug },
          select: { id: true },
        },
        {
          suppressReporting: true,
          source: 'admin-organizations',
          organizationId: '',
          reason: 'admin_create_org_check_slug',
        }
      )
    );

    if (existingOrgBySlug?.id) {
      return { success: false, error: createErrorResponse(null, 'Slug כבר תפוס').error || 'Slug כבר תפוס' };
    }

    const existingOwner = await prisma.organizationUser.findFirst(
      withPrismaTenantIsolationOverride(
        {
          where: { email: ownerEmail },
          select: { id: true, email: true, full_name: true },
        },
        {
          suppressReporting: true,
          source: 'admin-organizations',
          organizationId: '',
          reason: 'admin_create_org_find_owner',
        }
      )
    );

    if (existingOwner?.id) {
      const now = new Date();

      const createdOrg = await withTenantIsolationContext(
        {
          suppressReporting: true,
          reason: 'admin_create_organization_or_invite_owner_create_org',
          source: 'admin-organizations',
          mode: 'global_admin',
          isSuperAdmin: true,
        },
        async () => {
          const mods = Array.isArray(input.modules) ? input.modules : [];
          const hasMod = (k: string) => mods.includes(k);
          const createdOrg = await prisma.organization.create({
            data: {
              name,
              slug: desiredSlug,
              owner_id: String(existingOwner.id),
              has_nexus: mods.length > 0 ? hasMod('nexus') : true,
              has_social: hasMod('social'),
              has_system: hasMod('system'),
              has_finance: mods.length > 0 ? hasMod('finance') || hasMod('operations') : false,
              has_client: hasMod('client'),
              has_operations: hasMod('operations'),
              subscription_status: 'trial',
              subscription_plan: input.packageType ? String(input.packageType) : null,
              trial_start_date: now,
              trial_days: DEFAULT_TRIAL_DAYS,
              created_at: now,
              updated_at: now,
              ...(input.businessClientId ? { client_id: input.businessClientId } : {}),
            } satisfies OrganizationCreateData,
            select: { id: true },
          });

          await prisma.organizationUser.updateMany({
            where: { id: String(existingOwner.id) },
            data: { organization_id: createdOrg.id, updated_at: now } satisfies UserUpdateManyData,
          });

          return createdOrg;
        }
      );

      // Best-effort: auto-create BusinessClient if not already linked
      if (!input.businessClientId) {
        try {
          const { ensureBusinessClientForOrg } = await import('@/app/actions/business-clients');
          await ensureBusinessClientForOrg(createdOrg.id);
        } catch (e) {
          logger.error('createOrganizationOrInviteOwner', 'ensureBusinessClientForOrg failed (ignored)', e);
        }
      }

      try {
        const baseUrl = getBaseUrl();
        const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(desiredSlug))}`;
        const ownerEmailForSend = existingOwner?.email ? String(existingOwner.email) : ownerEmail;
        if (ownerEmailForSend) {
          await sendOrganizationWelcomeEmail({
            ownerEmail: ownerEmailForSend,
            organizationName: name,
            ownerName: existingOwner?.full_name ? String(existingOwner.full_name) : null,
            portalUrl,
          });
        }
      } catch {
        // ignore
      }

      return { success: true, data: { kind: 'organization', organizationId: createdOrg.id } };
    }

    const token = await generateUniqueOrgInviteToken();
    const now = new Date();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'admin_create_organization_or_invite_owner_create_invite',
        source: 'admin-organizations',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.organization_signup_invitations.create({
          data: {
            token,
            owner_email: ownerEmail,
            organization_name: name,
            desired_slug: desiredSlug,
            is_used: false,
            is_active: true,
            created_at: now,
            updated_at: now,
            expires_at: expiresAt,
            metadata: {},
          } satisfies OrgSignupInvitationCreateData,
        })
    );

    const baseUrl = getBaseUrl();
    const claimUrl = `${baseUrl}/login?mode=sign-up&invite=${encodeURIComponent(token)}&redirect=${encodeURIComponent('/workspaces/onboarding')}`;
    const { sendTenantInvitationEmail } = await import('@/lib/email');
    try {
      await sendTenantInvitationEmail(ownerEmail, name, claimUrl, { ownerName: null });
    } catch {
      // ignore
    }

    return { success: true, data: { kind: 'invitation', token, signupUrl: claimUrl } };
  } catch (error: unknown) {
    const msg = getUnknownErrorMessage(error);
    return { success: false, error: createErrorResponse(error, msg || 'שגיאה ביצירת הזמנה').error || msg || 'שגיאה ביצירת הזמנה' };
  }
}

export async function updateOrganization(input: {
  organizationId: string;
  name?: string;
  slug?: string;
  logo?: string | null;
  is_shabbat_protected?: boolean;
  is_medical_exempt?: boolean;
  has_nexus?: boolean;
  has_social?: boolean;
  has_system?: boolean;
  has_finance?: boolean;
  has_client?: boolean;
  has_operations?: boolean;
  subscription_status?: string;
  subscription_plan?: string;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const organizationId = (input.organizationId || '').trim();
    if (!organizationId) return createErrorResponse(null, 'organizationId חסר');

    const patch: OrganizationUpdateManyData = { updated_at: new Date() };

    if (input.name !== undefined) patch.name = String(input.name).trim();

    if (input.logo !== undefined) {
      patch.logo = input.logo === null ? null : String(input.logo);
    }

    if (input.slug !== undefined) {
      const desired = generateOrgSlug(String(input.slug));
      if (!desired) return createErrorResponse(null, 'Slug לא תקין');

      const existing = await prisma.organization.findFirst({
        where: { slug: desired, id: { not: organizationId } },
        select: { id: true },
      });

      if (existing) return createErrorResponse(null, 'Slug כבר תפוס');

      patch.slug = desired;
    }

    if (input.has_nexus !== undefined) patch.has_nexus = input.has_nexus;
    if (input.has_social !== undefined) patch.has_social = input.has_social;
    if (input.has_system !== undefined) patch.has_system = input.has_system;
    if (input.has_finance !== undefined) patch.has_finance = input.has_finance;
    if (input.has_client !== undefined) patch.has_client = input.has_client;
    if (input.has_operations !== undefined) patch.has_operations = input.has_operations;

    if (input.is_shabbat_protected !== undefined) {
      if (input.is_shabbat_protected === false) {
        const currentOrg = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { is_medical_exempt: true },
        });
        if (!currentOrg?.is_medical_exempt) {
          return { success: false, error: 'ניתן לבטל הגנת שבת רק עבור מוסדות רפואיים מאושרים' };
        }
      }
      patch.is_shabbat_protected = input.is_shabbat_protected;
    }

    if (input.is_medical_exempt !== undefined) {
      patch.is_medical_exempt = input.is_medical_exempt;
      if (!input.is_medical_exempt) {
        patch.is_shabbat_protected = true;
      }
    }

    if (input.subscription_status !== undefined) patch.subscription_status = input.subscription_status;
    if (input.subscription_plan !== undefined) patch.subscription_plan = input.subscription_plan;

    await prisma.organization.updateMany({
      where: { id: organizationId },
      data: patch,
    });

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון ארגון');
  }
}

export async function setOrganizationOwner(input: {
  organizationId: string;
  ownerUserId: string;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const organizationId = (input.organizationId || '').trim();
    const ownerUserId = (input.ownerUserId || '').trim();
    if (!organizationId || !ownerUserId) {
      return createErrorResponse(null, 'organizationId/ownerUserId חסרים');
    }

    const now = new Date();

    await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'admin_set_organization_owner',
        source: 'admin-organizations',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        await prisma.organization.updateMany({
          where: { id: organizationId },
          data: { owner_id: ownerUserId, updated_at: now } satisfies OrganizationUpdateManyData,
        });

        await prisma.organizationUser.updateMany({
          where: { id: ownerUserId },
          data: { organization_id: organizationId, updated_at: now } satisfies UserUpdateManyData,
        });
      }
    );

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון בעלים');
  }
}

export async function setUserOrganization(input: {
  userId: string;
  organizationId: string | null;
}): Promise<{ success: boolean; data?: true; error?: string }> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;

    const userId = (input.userId || '').trim();
    if (!userId) return createErrorResponse(null, 'userId חסר');

    const organizationId = input.organizationId ? String(input.organizationId).trim() : null;

    await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'admin_set_user_organization',
        source: 'admin-organizations',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.organizationUser.updateMany({
          where: { id: userId },
          data: { organization_id: organizationId, updated_at: new Date() } satisfies UserUpdateManyData,
        })
    );

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון שיוך משתמש לארגון');
  }
}
