'use server';

import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { sendOrganizationWelcomeEmail } from '@/lib/email';

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
  trial_start_date: string | null;
  trial_days: number | null;
  subscription_start_date: string | null;
  created_at: string | null;
  updated_at: string | null;
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

function normalizeSlug(input: string): string {
  return String((input as any) ?? '')
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

async function generateUniqueOrgInviteToken(supabase: any): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const token = randomBytes(16).toString('hex').toUpperCase().slice(0, 32);

    const { data, error } = await supabase
      .from('organization_signup_invitations')
      .select('id')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('does not exist') || String((error as any).code || '') === '42P01') {
        return token;
      }
      continue;
    }

    if (!data) return token;
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

    const supabase = createClient();
    const query = (params?.query || '').trim();
    const limit = Math.min(Math.max(params?.limit || 200, 1), 500);

    let orgsQuery = supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query) {
      orgsQuery = orgsQuery.or(`name.ilike.%${query}%,slug.ilike.%${query}%`);
    }

    const { data: orgs, error: orgsError } = await orgsQuery;
    if (orgsError) return createErrorResponse(orgsError, 'שגיאה בטעינת ארגונים');

    const ownerIds = Array.from(new Set((orgs || []).map((o: any) => o.owner_id).filter(Boolean)));

    const ownersById: Record<string, any> = {};
    if (ownerIds.length) {
      const { data: owners, error: ownersError } = await supabase
        .from('social_users')
        .select('id, email, full_name, clerk_user_id, role')
        .in('id', ownerIds);

      if (ownersError) {
        return createErrorResponse(ownersError, 'שגיאה בטעינת בעלי ארגונים');
      }

      for (const o of owners || []) ownersById[o.id] = o;
    }

    const orgIds = (orgs || []).map((o: any) => o.id);

    const membersCountByOrg: Record<string, number> = {};
    if (orgIds.length) {
      const { data: members, error: membersError } = await supabase
        .from('social_users')
        .select('organization_id')
        .in('organization_id', orgIds);

      if (membersError) {
        return createErrorResponse(membersError, 'שגיאה בטעינת משתמשי ארגונים');
      }

      for (const m of members || []) {
        const key = m.organization_id;
        if (!key) continue;
        membersCountByOrg[key] = (membersCountByOrg[key] || 0) + 1;
      }
    }

    const enriched: OrganizationWithOwner[] = (orgs || []).map((o: any) => ({
      ...o,
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

    const supabase = createClient();
    const query = (params?.query || '').trim();
    const limit = Math.min(Math.max(params?.limit || 200, 1), 500);

    let q = supabase
      .from('social_users')
      .select('id, clerk_user_id, email, full_name, role, organization_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query) {
      q = q.or(`email.ilike.%${query}%,full_name.ilike.%${query}%,clerk_user_id.ilike.%${query}%`);
    }

    const { data, error } = await q;
    if (error) return createErrorResponse(error, 'שגיאה בטעינת משתמשים');

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

    const supabase = createClient();

    const name = (input.name || '').trim();
    if (!name) return createErrorResponse(null, 'שם ארגון חובה');

    const ownerUserId = (input.ownerUserId || '').trim();
    if (!ownerUserId) return createErrorResponse(null, 'בעלים (ownerUserId) חובה');

    const baseSlug = normalizeSlug(input.slug || name);
    if (!baseSlug) return createErrorResponse(null, 'Slug לא תקין');

    let finalSlug = baseSlug;
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
      const { data: existing, error: existsError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (existsError) return createErrorResponse(existsError, 'שגיאה בבדיקת slug');
      if (!existing) {
        finalSlug = candidate;
        break;
      }
    }

    const now = new Date().toISOString();

    const { data: createdOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({
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
        trial_days: input.trial_days ?? 30,
      } as any)
      .select('id')
      .single();

    if (createOrgError || !createdOrg?.id) {
      return createErrorResponse(createOrgError || new Error('Failed to create org'), 'שגיאה ביצירת ארגון');
    }

    const { error: linkOwnerError } = await supabase
      .from('social_users')
      .update({ organization_id: createdOrg.id, updated_at: now } as any)
      .eq('id', ownerUserId);

    if (linkOwnerError) {
      return createErrorResponse(linkOwnerError, 'הארגון נוצר, אך נכשל שיוך הבעלים לארגון');
    }

    // Best-effort: send welcome email with portal link
    try {
      const { data: owner } = await supabase
        .from('social_users')
        .select('email, full_name')
        .eq('id', ownerUserId)
        .maybeSingle();

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

    const supabase = createClient();

    const name = (input.name || '').trim();
    if (!name) return createErrorResponse(null, 'שם ארגון חובה') as any;

    const desiredSlug = normalizeSlug(input.slug || '');
    if (!desiredSlug) return createErrorResponse(null, 'Slug לא תקין') as any;

    const ownerEmail = normalizeEmail(input.ownerEmail || '');
    if (!ownerEmail || !ownerEmail.includes('@')) {
      return createErrorResponse(null, 'אימייל בעלים לא תקין') as any;
    }

    const { data: existingOrgBySlug, error: existsOrgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', desiredSlug)
      .maybeSingle();

    if (existsOrgError) return createErrorResponse(existsOrgError, 'שגיאה בבדיקת slug') as any;
    if (existingOrgBySlug?.id) return createErrorResponse(null, 'Slug כבר תפוס') as any;

    const { data: existingOwner } = await supabase
      .from('social_users')
      .select('id, email, full_name')
      .eq('email', ownerEmail)
      .maybeSingle();

    if (existingOwner?.id) {
      const now = new Date().toISOString();

      const { data: createdOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: desiredSlug,
          owner_id: existingOwner.id,
          has_nexus: true,
          has_social: false,
          has_system: false,
          has_finance: false,
          has_client: false,
          has_operations: false,
          subscription_status: 'trial',
          subscription_plan: null,
          trial_start_date: now,
          trial_days: 30,
          created_at: now,
          updated_at: now,
        } as any)
        .select('id')
        .single();

      if (createOrgError || !createdOrg?.id) {
        return createErrorResponse(createOrgError || new Error('Failed to create org'), 'שגיאה ביצירת ארגון') as any;
      }

      const { error: linkOwnerError } = await supabase
        .from('social_users')
        .update({ organization_id: createdOrg.id, updated_at: now } as any)
        .eq('id', existingOwner.id);

      if (linkOwnerError) {
        return createErrorResponse(linkOwnerError, 'הארגון נוצר, אך נכשל שיוך הבעלים לארגון') as any;
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

      return createSuccessResponse({ kind: 'organization', organizationId: createdOrg.id }) as any;
    }

    const token = await generateUniqueOrgInviteToken(supabase);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    const { error: inviteInsertError } = await supabase
      .from('organization_signup_invitations')
      .insert({
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
      } as any);

    if (inviteInsertError) {
      return createErrorResponse(inviteInsertError, 'שגיאה ביצירת הזמנה') as any;
    }

    const baseUrl = getBaseUrl();
    const claimUrl = `${baseUrl}/sign-up?invite=${encodeURIComponent(token)}&redirect_url=${encodeURIComponent('/workspaces/new')}`;
    const { sendTenantInvitationEmail } = await import('@/lib/email');
    try {
      await sendTenantInvitationEmail(ownerEmail, name, claimUrl, { ownerName: null });
    } catch {
      // ignore
    }

    return createSuccessResponse({ kind: 'invitation', token, signupUrl: claimUrl }) as any;
  } catch (error: any) {
    return createErrorResponse(error, error?.message || 'שגיאה ביצירת הזמנה') as any;
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

    const supabase = createClient();

    const organizationId = (input.organizationId || '').trim();
    if (!organizationId) return createErrorResponse(null, 'organizationId חסר');

    const patch: any = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) patch.name = String(input.name).trim();

    if (input.logo !== undefined) {
      patch.logo = input.logo === null ? null : String(input.logo);
    }

    if (input.slug !== undefined) {
      const desired = normalizeSlug(String(input.slug));
      if (!desired) return createErrorResponse(null, 'Slug לא תקין');

      const { data: existing, error: existsError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', desired)
        .neq('id', organizationId)
        .maybeSingle();

      if (existsError) return createErrorResponse(existsError, 'שגיאה בבדיקת slug');
      if (existing) return createErrorResponse(null, 'Slug כבר תפוס');

      patch.slug = desired;
    }

    const boolFields: Array<keyof typeof input> = ['has_nexus', 'has_social', 'has_system', 'has_finance', 'has_client', 'has_operations'];
    for (const f of boolFields) {
      if (input[f] !== undefined) patch[f] = input[f];
    }

    if (input.subscription_status !== undefined) patch.subscription_status = input.subscription_status;
    if (input.subscription_plan !== undefined) patch.subscription_plan = input.subscription_plan;

    const { error } = await supabase
      .from('organizations')
      .update(patch)
      .eq('id', organizationId);

    if (error) return createErrorResponse(error, 'שגיאה בעדכון ארגון');

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

    const supabase = createClient();

    const organizationId = (input.organizationId || '').trim();
    const ownerUserId = (input.ownerUserId || '').trim();
    if (!organizationId || !ownerUserId) {
      return createErrorResponse(null, 'organizationId/ownerUserId חסרים');
    }

    const now = new Date().toISOString();

    const { error: updateOrgError } = await supabase
      .from('organizations')
      .update({ owner_id: ownerUserId, updated_at: now } as any)
      .eq('id', organizationId);

    if (updateOrgError) return createErrorResponse(updateOrgError, 'שגיאה בעדכון בעלים');

    const { error: updateUserError } = await supabase
      .from('social_users')
      .update({ organization_id: organizationId, updated_at: now } as any)
      .eq('id', ownerUserId);

    if (updateUserError) return createErrorResponse(updateUserError, 'הבעלים עודכן, אך נכשל שיוך משתמש לארגון');

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

    const supabase = createClient();

    const userId = (input.userId || '').trim();
    if (!userId) return createErrorResponse(null, 'userId חסר');

    const organizationId = input.organizationId ? String(input.organizationId).trim() : null;

    const { error } = await supabase
      .from('social_users')
      .update({ organization_id: organizationId, updated_at: new Date().toISOString() } as any)
      .eq('id', userId);

    if (error) return createErrorResponse(error, 'שגיאה בעדכון שיוך משתמש לארגון');

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון שיוך משתמש לארגון');
  }
}
