'use server';

import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendOrganizationWelcomeEmail } from '@/lib/email';

type SocialOrganizationsCreateData = Parameters<typeof prisma.social_organizations.create>[0]['data'];
type SocialOrganizationsUpdateManyData = Parameters<typeof prisma.social_organizations.updateMany>[0]['data'];
type SocialUsersUpdateManyData = Parameters<typeof prisma.social_users.updateMany>[0]['data'];
type OrgSignupInvitationCreateData = Parameters<typeof prisma.organization_signup_invitations.create>[0]['data'];

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  owner_id: string;
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
};

export type SocialUserLite = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  organization_id: string | null;
};

export type OrganizationWithOwner = OrganizationRecord & {
  owner?: Pick<SocialUserLite, 'id' | 'email' | 'full_name' | 'clerk_user_id' | 'role'> | null;
  membersCount?: number;
};

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    return typeof msg === 'string' ? msg : 'שגיאה לא צפויה';
  }
  return 'שגיאה לא צפויה';
}

function normalizeSlug(input: string): string {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/['\"`]/g, '')
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

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
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;
    const query = (params?.query || '').trim();
    const limit = Math.min(Math.max(params?.limit || 200, 1), 500);

    const orgs = await prisma.social_organizations.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        owner_id: true,
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
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    const ownerIds = Array.from(new Set((orgs || []).map((o) => o.owner_id).filter(Boolean)));

    const ownersById: Record<string, { id: string; email: string | null; full_name: string | null; clerk_user_id: string; role: string | null }> = {};
    if (ownerIds.length) {
      const owners = await prisma.social_users.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, email: true, full_name: true, clerk_user_id: true, role: true },
      });

      for (const o of owners || []) {
        ownersById[String(o.id)] = {
          id: String(o.id),
          email: o.email == null ? null : String(o.email),
          full_name: o.full_name == null ? null : String(o.full_name),
          clerk_user_id: String(o.clerk_user_id),
          role: o.role == null ? null : String(o.role),
        };
      }
    }

    const orgIds = (orgs || []).map((o) => o.id);

    const membersCountByOrg: Record<string, number> = {};
    if (orgIds.length) {
      const group = await prisma.social_users.groupBy({
        by: ['organization_id'],
        where: { organization_id: { in: orgIds } },
        _count: { _all: true },
      });

      for (const g of group || []) {
        const key = String(g.organization_id || '');
        if (!key) continue;
        membersCountByOrg[key] = Number(g._count._all || 0);
      }
    }

    function toIsoOrNull(value: unknown): string | null {
      if (!value) return null;
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }

    const enriched: OrganizationWithOwner[] = (orgs || []).map((o) => ({
      id: String(o.id),
      name: String(o.name),
      slug: o.slug == null ? null : String(o.slug),
      logo: o.logo == null ? null : String(o.logo),
      owner_id: String(o.owner_id),
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
    }));

    return createSuccessResponse(enriched);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת ארגונים');
  }
}

export async function getSocialUsersLite(params?: {
  query?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: SocialUserLite[]; error?: string }> {
  try {
    const guard = await requireSuperAdmin();
    if (!guard.success) return guard;
    const query = (params?.query || '').trim();
    const limit = Math.min(Math.max(params?.limit || 200, 1), 500);

    const data = await prisma.social_users.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { full_name: { contains: query, mode: 'insensitive' } },
              { clerk_user_id: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: { id: true, clerk_user_id: true, email: true, full_name: true, role: true, organization_id: true },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return createSuccessResponse(data || []);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת משתמשים');
  }
}

export async function createOrganization(input: {
  name: string;
  slug?: string;
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

    const baseSlug = normalizeSlug(input.slug || name);
    if (!baseSlug) return createErrorResponse(null, 'Slug לא תקין');

    let finalSlug = baseSlug;
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
      const existing = await prisma.social_organizations.findFirst({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        finalSlug = candidate;
        break;
      }
    }

    const now = new Date();

    const createdOrg = await prisma.social_organizations.create({
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
        trial_days: input.trial_days ?? 7,
        created_at: now,
        updated_at: now,
      } satisfies SocialOrganizationsCreateData,
      select: { id: true },
    });

    await prisma.social_users.updateMany({
      where: { id: ownerUserId },
      data: { organization_id: createdOrg.id, updated_at: now } satisfies SocialUsersUpdateManyData,
    });

    // Best-effort: send welcome email with portal link
    try {
      const owner = await prisma.social_users.findFirst({
        where: { id: ownerUserId },
        select: { email: true, full_name: true },
      });

      const ownerEmail = owner?.email ? String(owner.email) : null;
      if (ownerEmail) {
        const baseUrl = getBaseUrl();
        const portalSlug = finalSlug || createdOrg.id;
        const portalUrl = `${baseUrl}/w/${encodeURIComponent(String(portalSlug))}`;
        await sendOrganizationWelcomeEmail({
          ownerEmail,
          organizationName: name,
          ownerName: owner?.full_name ? String(owner.full_name) : null,
          portalUrl,
        });
      }
    } catch (e) {
      console.error('[createOrganization] welcome email failed (ignored)', e);
    }

    return createSuccessResponse({ organizationId: createdOrg.id });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה ביצירת ארגון');
  }
}

export async function createOrganizationOrInviteOwner(input: {
  name: string;
  slug: string;
  ownerEmail: string;
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

    const desiredSlug = normalizeSlug(input.slug || '');
    if (!desiredSlug) return { success: false, error: createErrorResponse(null, 'Slug לא תקין').error || 'Slug לא תקין' };

    const ownerEmail = normalizeEmail(input.ownerEmail || '');
    if (!ownerEmail || !ownerEmail.includes('@')) {
      return { success: false, error: createErrorResponse(null, 'אימייל בעלים לא תקין').error || 'אימייל בעלים לא תקין' };
    }

    const existingOrgBySlug = await prisma.social_organizations.findFirst({
      where: { slug: desiredSlug },
      select: { id: true },
    });

    if (existingOrgBySlug?.id) {
      return { success: false, error: createErrorResponse(null, 'Slug כבר תפוס').error || 'Slug כבר תפוס' };
    }

    const existingOwner = await prisma.social_users.findFirst({
      where: { email: ownerEmail },
      select: { id: true, email: true, full_name: true },
    });

    if (existingOwner?.id) {
      const now = new Date();

      const createdOrg = await prisma.social_organizations.create({
        data: {
          name,
          slug: desiredSlug,
          owner_id: String(existingOwner.id),
          has_nexus: true,
          has_social: false,
          has_system: false,
          has_finance: false,
          has_client: false,
          has_operations: false,
          subscription_status: 'trial',
          subscription_plan: null,
          trial_start_date: now,
          trial_days: 7,
          created_at: now,
          updated_at: now,
        } satisfies SocialOrganizationsCreateData,
        select: { id: true },
      });

      await prisma.social_users.updateMany({
        where: { id: String(existingOwner.id) },
        data: { organization_id: createdOrg.id, updated_at: now } satisfies SocialUsersUpdateManyData,
      });

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
    });

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

    const patch = { updated_at: new Date() } as unknown as SocialOrganizationsUpdateManyData;

    if (input.name !== undefined) patch.name = String(input.name).trim();

    if (input.logo !== undefined) {
      patch.logo = input.logo === null ? null : String(input.logo);
    }

    if (input.slug !== undefined) {
      const desired = normalizeSlug(String(input.slug));
      if (!desired) return createErrorResponse(null, 'Slug לא תקין');

      const existing = await prisma.social_organizations.findFirst({
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

    if (input.subscription_status !== undefined) patch.subscription_status = input.subscription_status;
    if (input.subscription_plan !== undefined) patch.subscription_plan = input.subscription_plan;

    await prisma.social_organizations.updateMany({
      where: { id: organizationId },
      data: patch,
    });

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

    await prisma.social_organizations.updateMany({
      where: { id: organizationId },
      data: { owner_id: ownerUserId, updated_at: now } satisfies SocialOrganizationsUpdateManyData,
    });

    await prisma.social_users.updateMany({
      where: { id: ownerUserId },
      data: { organization_id: organizationId, updated_at: now } satisfies SocialUsersUpdateManyData,
    });

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

    await prisma.social_users.updateMany({
      where: { id: userId },
      data: { organization_id: organizationId, updated_at: new Date() } satisfies SocialUsersUpdateManyData,
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון שיוך משתמש לארגון');
  }
}
