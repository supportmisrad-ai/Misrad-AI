'use server';

import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';

async function requireSuperAdminOrFail() {
  const authCheck = await requireAuth();
  if (!authCheck.success) return authCheck as any;
  const u = await currentUser();
  const isSuperAdmin = Boolean((u as any)?.publicMetadata?.isSuperAdmin);
  if (!isSuperAdmin) {
    return createErrorResponse('Forbidden', 'אין הרשאה');
  }
  return { success: true, userId: authCheck.userId } as const;
}

async function resolveOrganizationIdFromTenantKey(supabase: any, tenantKey: string): Promise<string | null> {
  const key = String(tenantKey || '').trim();
  if (!key) return null;

  const directOrg = await supabase
    .from('organizations')
    .select('id')
    .or(`id.eq.${key},slug.eq.${key}`)
    .maybeSingle();

  if (directOrg?.data?.id) {
    return String(directOrg.data.id);
  }

  const tenantById = await supabase
    .from('nexus_tenants')
    .select('owner_email, subdomain')
    .or(`id.eq.${key},subdomain.eq.${key}`)
    .maybeSingle();

  const ownerEmail = tenantById?.data?.owner_email ? String(tenantById.data.owner_email) : '';
  const subdomain = tenantById?.data?.subdomain ? String(tenantById.data.subdomain) : '';

  if (ownerEmail) {
    const { data: ownerSocialUser } = await supabase
      .from('social_users')
      .select('id')
      .ilike('email', ownerEmail)
      .maybeSingle();

    if (ownerSocialUser?.id) {
      const { data: orgByOwner } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', String(ownerSocialUser.id))
        .maybeSingle();

      if (orgByOwner?.id) {
        return String(orgByOwner.id);
      }
    }
  }

  if (!subdomain) return null;

  const orgBySlug = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', subdomain)
    .maybeSingle();

  return orgBySlug?.data?.id ? String(orgBySlug.data.id) : null;
}

async function resolveTenantIdFromKey(supabase: any, tenantKey: string): Promise<string | null> {
  const key = String(tenantKey || '').trim();
  if (!key) return null;

  const tenant = await supabase
    .from('nexus_tenants')
    .select('id')
    .or(`id.eq.${key},subdomain.eq.${key}`)
    .maybeSingle();

  return tenant?.data?.id ? String(tenant.data.id) : null;
}

export type AdminSocialTeamUser = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'team_member';
};

export type AdminSocialQuotas = {
  maxPostsPerMonth: number;
  maxConnectedAccounts: number;
  maxTeamMembers: number;
};

export type AdminSocialIntegrationStatus = {
  provider: 'facebook' | 'instagram' | 'whatsapp';
  label: string;
  connected: boolean;
  tokenExpiresAt: string | null;
  connectedAt: string | null;
};

export type AdminSocialAutomation = {
  enableAutoReplySystem: boolean;
  allowExternalWebhooks: boolean;
};

export async function getSocialTeam(tenantId: string): Promise<{ success: boolean; data?: AdminSocialTeamUser[]; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const organizationId = await resolveOrganizationIdFromTenantKey(supabase, tenantId);
    if (!organizationId) {
      return createSuccessResponse([]) as any;
    }

    const { data: teamMembers } = await supabase
      .from('social_team_members')
      .select('user_id')
      .eq('organization_id', organizationId);

    const memberIds = (teamMembers || [])
      .map((r: any) => r?.user_id)
      .filter(Boolean)
      .map((v: any) => String(v));

    let socialUsersQuery = supabase
      .from('social_users')
      .select('id, clerk_user_id, email, full_name, role, organization_id')
      .order('created_at', { ascending: false });

    if (memberIds.length > 0) {
      socialUsersQuery = socialUsersQuery.or(`organization_id.eq.${organizationId},id.in.(${memberIds.join(',')})`);
    } else {
      socialUsersQuery = socialUsersQuery.eq('organization_id', organizationId);
    }

    const { data: socialUsers, error: socialUsersError } = await socialUsersQuery;
    if (socialUsersError) {
      return createErrorResponse(socialUsersError, 'שגיאה בטעינת צוות סושיאל');
    }

    const emails = Array.from(
      new Set(
        (socialUsers || [])
          .map((u: any) => String(u?.email || '').trim().toLowerCase())
          .filter(Boolean)
      )
    );

    let nexusUsersByEmail = new Map<string, { name?: string | null; email?: string | null }>();

    if (emails.length > 0) {
      const { data: nexusUsers } = await supabase
        .from('nexus_users')
        .select('name, email')
        .in('email', emails);

      for (const nu of nexusUsers || []) {
        const em = String((nu as any)?.email || '').trim().toLowerCase();
        if (!em) continue;
        nexusUsersByEmail.set(em, { name: (nu as any)?.name ?? null, email: (nu as any)?.email ?? null });
      }
    }

    const mapped: AdminSocialTeamUser[] = (socialUsers || []).map((su: any) => {
      const email = String(su?.email || '').trim();
      const emailKey = email.toLowerCase();
      const nu = emailKey ? nexusUsersByEmail.get(emailKey) : undefined;

      const name = String(nu?.name || su?.full_name || email || su?.id || '').trim() || '—';
      const roleRaw = String(su?.role || 'team_member');
      const role: AdminSocialTeamUser['role'] =
        roleRaw === 'super_admin' || roleRaw === 'owner' || roleRaw === 'team_member' ? roleRaw : 'team_member';

      return {
        id: String(su?.id || ''),
        name,
        email: String(nu?.email || email || 'אין דוא"ל'),
        role,
      };
    });

    return createSuccessResponse(mapped) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת צוות סושיאל');
  }
}

function normalizeAutomation(input: any): AdminSocialAutomation {
  return {
    enableAutoReplySystem: Boolean(input?.enableAutoReplySystem),
    allowExternalWebhooks: Boolean(input?.allowExternalWebhooks),
  };
}

export async function getSocialAutomation(
  tenantId: string
): Promise<{ success: boolean; data?: AdminSocialAutomation; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const resolvedTenantId = await resolveTenantIdFromKey(supabase, tenantId);
    if (!resolvedTenantId) {
      return createSuccessResponse(normalizeAutomation(null)) as any;
    }

    const { data, error } = await supabase
      .from('system_settings')
      .select('id, system_flags')
      .eq('tenant_id', resolvedTenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת אוטומציות');
    }

    const flags = (data as any)?.system_flags || {};
    const automation = normalizeAutomation((flags as any)?.socialAutomation);
    return createSuccessResponse(automation) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת אוטומציות');
  }
}

export async function updateSocialAutomation(
  tenantId: string,
  automation: AdminSocialAutomation
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const resolvedTenantId = await resolveTenantIdFromKey(supabase, tenantId);
    if (!resolvedTenantId) {
      return createErrorResponse('Tenant not found', 'טננט לא נמצא');
    }

    const { data: existingRow } = await supabase
      .from('system_settings')
      .select('id, system_flags')
      .eq('tenant_id', resolvedTenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    const nextFlags = {
      ...((existingRow as any)?.system_flags || {}),
      socialAutomation: normalizeAutomation(automation),
    };

    if ((existingRow as any)?.id) {
      const { error } = await supabase
        .from('system_settings')
        .update({ system_flags: nextFlags as any, updated_at: now } as any)
        .eq('id', (existingRow as any).id);

      if (error) {
        return createErrorResponse(error, 'שגיאה בשמירת אוטומציות');
      }
      return createSuccessResponse(true) as any;
    }

    const { error: insertError } = await supabase
      .from('system_settings')
      .insert({ tenant_id: resolvedTenantId, system_flags: nextFlags as any, created_at: now, updated_at: now } as any);

    if (insertError) {
      return createErrorResponse(insertError, 'שגיאה בשמירת אוטומציות');
    }

    return createSuccessResponse(true) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשמירת אוטומציות');
  }
}

export async function updateSocialUserRole(
  tenantId: string,
  userId: string,
  role: AdminSocialTeamUser['role']
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const resolvedRole = String(role || 'team_member');
    if (resolvedRole !== 'super_admin' && resolvedRole !== 'owner' && resolvedRole !== 'team_member') {
      return createErrorResponse('Invalid role', 'תפקיד לא תקין');
    }

    const organizationId = await resolveOrganizationIdFromTenantKey(supabase, tenantId);
    if (!organizationId) {
      return createErrorResponse('Organization not found', 'טננט לא נמצא');
    }

    const resolvedUserId = String(userId || '').trim();
    if (!resolvedUserId) {
      return createErrorResponse('Missing userId', 'משתמש לא תקין');
    }

    const { data: userRow, error: userError } = await supabase
      .from('social_users')
      .select('id, organization_id')
      .eq('id', resolvedUserId)
      .maybeSingle();

    if (userError || !userRow?.id) {
      return createErrorResponse(userError || 'User not found', 'משתמש לא נמצא');
    }

    if (String(userRow.organization_id || '') !== String(organizationId)) {
      return createErrorResponse('Forbidden', 'המשתמש לא שייך לטננט הזה');
    }

    const { error } = await supabase
      .from('social_users')
      .update({ role: resolvedRole } as any)
      .eq('id', resolvedUserId);

    if (error) {
      return createErrorResponse(error, 'שגיאה בעדכון תפקיד');
    }

    return createSuccessResponse(true) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון תפקיד');
  }
}

export async function removeSocialUser(
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const organizationId = await resolveOrganizationIdFromTenantKey(supabase, tenantId);
    if (!organizationId) {
      return createErrorResponse('Organization not found', 'טננט לא נמצא');
    }

    const resolvedUserId = String(userId || '').trim();
    if (!resolvedUserId) {
      return createErrorResponse('Missing userId', 'משתמש לא תקין');
    }

    const { data: orgRow, error: orgError } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError) {
      return createErrorResponse(orgError, 'שגיאה בהסרת משתמש');
    }

    if (String((orgRow as any)?.owner_id || '') === resolvedUserId) {
      return createErrorResponse('Forbidden', 'לא ניתן להסיר את בעל הארגון');
    }

    const { data: userRow, error: userError } = await supabase
      .from('social_users')
      .select('id, organization_id')
      .eq('id', resolvedUserId)
      .maybeSingle();

    if (userError || !userRow?.id) {
      return createErrorResponse(userError || 'User not found', 'משתמש לא נמצא');
    }

    if (String(userRow.organization_id || '') !== String(organizationId)) {
      return createErrorResponse('Forbidden', 'המשתמש לא שייך לטננט הזה');
    }

    const cleanOauth = await supabase.from('social_oauth_tokens').delete().eq('user_id', resolvedUserId);
    if (cleanOauth.error) {
      return createErrorResponse(cleanOauth.error, 'שגיאה בהסרת משתמש');
    }

    const cleanWebhooks = await supabase.from('social_webhook_configs').delete().eq('user_id', resolvedUserId);
    if (cleanWebhooks.error) {
      return createErrorResponse(cleanWebhooks.error, 'שגיאה בהסרת משתמש');
    }

    const cleanViews = await supabase.from('social_user_update_views').delete().eq('user_id', resolvedUserId);
    if (cleanViews.error) {
      return createErrorResponse(cleanViews.error, 'שגיאה בהסרת משתמש');
    }

    const cleanTeamMember = await supabase.from('social_team_members').delete().eq('user_id', resolvedUserId);
    if (cleanTeamMember.error) {
      return createErrorResponse(cleanTeamMember.error, 'שגיאה בהסרת משתמש');
    }

    const { error: deleteError } = await supabase.from('social_users').delete().eq('id', resolvedUserId);
    if (deleteError) {
      return createErrorResponse(deleteError, 'שגיאה בהסרת משתמש');
    }

    return createSuccessResponse(true) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בהסרת משתמש');
  }
}

function normalizeQuotas(input: any): AdminSocialQuotas {
  const maxPostsPerMonth = Number(input?.maxPostsPerMonth);
  const maxConnectedAccounts = Number(input?.maxConnectedAccounts);
  const maxTeamMembers = Number(input?.maxTeamMembers);
  return {
    maxPostsPerMonth: Number.isFinite(maxPostsPerMonth) && maxPostsPerMonth >= 0 ? maxPostsPerMonth : 0,
    maxConnectedAccounts:
      Number.isFinite(maxConnectedAccounts) && maxConnectedAccounts >= 0 ? maxConnectedAccounts : 0,
    maxTeamMembers: Number.isFinite(maxTeamMembers) && maxTeamMembers >= 0 ? maxTeamMembers : 0,
  };
}

export async function getSocialQuotas(
  tenantId: string
): Promise<{ success: boolean; data?: AdminSocialQuotas; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const resolvedTenantId = await resolveTenantIdFromKey(supabase, tenantId);
    if (!resolvedTenantId) {
      return createSuccessResponse(normalizeQuotas(null)) as any;
    }

    const { data, error } = await supabase
      .from('system_settings')
      .select('id, system_flags')
      .eq('tenant_id', resolvedTenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return createErrorResponse(error, 'שגיאה בטעינת מכסות');
    }

    const flags = (data as any)?.system_flags || {};
    const quotas = normalizeQuotas((flags as any)?.socialQuotas);
    return createSuccessResponse(quotas) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת מכסות');
  }
}

export async function updateSocialQuotas(
  tenantId: string,
  quotas: AdminSocialQuotas
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const resolvedTenantId = await resolveTenantIdFromKey(supabase, tenantId);
    if (!resolvedTenantId) {
      return createErrorResponse('Tenant not found', 'טננט לא נמצא');
    }

    const { data: existingRow } = await supabase
      .from('system_settings')
      .select('id, system_flags')
      .eq('tenant_id', resolvedTenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    const nextFlags = {
      ...((existingRow as any)?.system_flags || {}),
      socialQuotas: normalizeQuotas(quotas),
    };

    if ((existingRow as any)?.id) {
      const { error } = await supabase
        .from('system_settings')
        .update({ system_flags: nextFlags as any, updated_at: now } as any)
        .eq('id', (existingRow as any).id);

      if (error) {
        return createErrorResponse(error, 'שגיאה בשמירת מכסות');
      }
      return createSuccessResponse(true) as any;
    }

    const { error: insertError } = await supabase
      .from('system_settings')
      .insert({ tenant_id: resolvedTenantId, system_flags: nextFlags as any, created_at: now, updated_at: now } as any);

    if (insertError) {
      return createErrorResponse(insertError, 'שגיאה בשמירת מכסות');
    }

    return createSuccessResponse(true) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשמירת מכסות');
  }
}

export async function getSocialIntegrations(
  tenantId: string
): Promise<{ success: boolean; data?: AdminSocialIntegrationStatus[]; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const organizationId = await resolveOrganizationIdFromTenantKey(supabase, tenantId);
    if (!organizationId) {
      return createSuccessResponse([
        { provider: 'facebook', label: 'Facebook', connected: false, tokenExpiresAt: null, connectedAt: null },
        { provider: 'instagram', label: 'Instagram', connected: false, tokenExpiresAt: null, connectedAt: null },
        { provider: 'whatsapp', label: 'WhatsApp', connected: false, tokenExpiresAt: null, connectedAt: null },
      ]) as any;
    }

    const { data: socialUsers, error: usersError } = await supabase
      .from('social_users')
      .select('id')
      .eq('organization_id', organizationId);

    if (usersError) {
      return createErrorResponse(usersError, 'שגיאה בטעינת אינטגרציות');
    }

    const userIds = (socialUsers || []).map((u: any) => String(u.id)).filter(Boolean);
    if (userIds.length === 0) {
      return createSuccessResponse([
        { provider: 'facebook', label: 'Facebook', connected: false, tokenExpiresAt: null, connectedAt: null },
        { provider: 'instagram', label: 'Instagram', connected: false, tokenExpiresAt: null, connectedAt: null },
        { provider: 'whatsapp', label: 'WhatsApp', connected: false, tokenExpiresAt: null, connectedAt: null },
      ]) as any;
    }

    const { data: tokens, error: tokensError } = await supabase
      .from('social_oauth_tokens')
      .select('integration_name, expires_at, created_at, updated_at')
      .in('user_id', userIds);

    if (tokensError) {
      return createErrorResponse(tokensError, 'שגיאה בטעינת אינטגרציות');
    }

    const normalizeProvider = (name: string): 'facebook' | 'instagram' | 'whatsapp' | null => {
      const n = String(name || '').toLowerCase();
      if (n.includes('facebook')) return 'facebook';
      if (n.includes('instagram')) return 'instagram';
      if (n.includes('whatsapp')) return 'whatsapp';
      return null;
    };

    const latestByProvider = new Map<string, any>();
    for (const t of tokens || []) {
      const provider = normalizeProvider((t as any).integration_name);
      if (!provider) continue;
      const prev = latestByProvider.get(provider);
      const tUpdated = new Date((t as any).updated_at || (t as any).created_at || 0).getTime();
      const pUpdated = prev ? new Date(prev.updated_at || prev.created_at || 0).getTime() : 0;
      if (!prev || tUpdated > pUpdated) {
        latestByProvider.set(provider, t);
      }
    }

    const toRow = (provider: 'facebook' | 'instagram' | 'whatsapp', label: string): AdminSocialIntegrationStatus => {
      const row = latestByProvider.get(provider);
      return {
        provider,
        label,
        connected: Boolean(row),
        tokenExpiresAt: row?.expires_at ? String(row.expires_at) : null,
        connectedAt: row?.created_at ? String(row.created_at) : null,
      };
    };

    const result: AdminSocialIntegrationStatus[] = [
      toRow('facebook', 'Facebook'),
      toRow('instagram', 'Instagram'),
      toRow('whatsapp', 'WhatsApp'),
    ];

    return createSuccessResponse(result) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת אינטגרציות');
  }
}

export async function disconnectSocialIntegration(
  tenantId: string,
  provider: AdminSocialIntegrationStatus['provider']
): Promise<{ success: boolean; data?: { deleted: number }; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck as any;

    const supabase = createClient();
    if (!supabase || typeof supabase.from !== 'function') {
      return createErrorResponse('Supabase client not available', 'שגיאה בחיבור למסד הנתונים');
    }

    const organizationId = await resolveOrganizationIdFromTenantKey(supabase, tenantId);
    if (!organizationId) {
      return createErrorResponse('Organization not found', 'טננט לא נמצא');
    }

    const { data: socialUsers, error: usersError } = await supabase
      .from('social_users')
      .select('id')
      .eq('organization_id', organizationId);

    if (usersError) {
      return createErrorResponse(usersError, 'שגיאה בניתוק אינטגרציה');
    }

    const userIds = (socialUsers || []).map((u: any) => String(u?.id || '')).filter(Boolean);
    if (userIds.length === 0) {
      return createSuccessResponse({ deleted: 0 }) as any;
    }

    const { data, error } = await supabase
      .from('social_oauth_tokens')
      .delete()
      .in('user_id', userIds)
      .ilike('integration_name', `%${String(provider || '').toLowerCase()}%`)
      .select('id');

    if (error) {
      return createErrorResponse(error, 'שגיאה בניתוק אינטגרציה');
    }

    return createSuccessResponse({ deleted: (data || []).length }) as any;
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בניתוק אינטגרציה');
  }
}
