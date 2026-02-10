'use server';

import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { Prisma } from '@prisma/client';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

type SuperAdminCheckResult =
  | { success: true; userId: string }
  | { success: false; error?: string; errors?: unknown };

function getErrorCode(error: unknown): string {
  const obj = asObject(error);
  const code = obj?.code;
  return typeof code === 'string' ? code : '';
}

function getBooleanProp(obj: unknown, key: string): boolean {
  const o = asObject(obj);
  return Boolean(o && o[key]);
}

function getJsonObject(value: unknown): Record<string, unknown> {
  const obj = asObject(value);
  return obj ?? {};
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => toInputJsonValue(v));

  const obj = asObject(value);
  if (!obj) return {};

  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = toInputJsonValue(v);
  }
  return out;
}

 function isUuidLike(value: string | null | undefined): boolean {
   const v = String(value || '').trim();
   if (!v) return false;
   const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
   return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
 }

async function requireSuperAdminOrFail(): Promise<SuperAdminCheckResult> {
  const authCheck = await requireAuth();
  if (!authCheck.success) {
    return { success: false, error: authCheck.error, errors: authCheck.errors };
  }
  const u = await currentUser();
  const isSuperAdmin = getBooleanProp(u?.publicMetadata, 'isSuperAdmin');
  if (!isSuperAdmin) {
    return { success: false, error: 'אין הרשאה' };
  }
  const userId = String(authCheck.userId ?? authCheck.data?.userId ?? '').trim();
  if (!userId) return { success: false, error: 'נדרשת התחברות' };
  return { success: true, userId };
}

async function resolveOrganizationIdFromTenantKey(tenantKey: string): Promise<string | null> {
  const key = String(tenantKey || '').trim();
  if (!key) return null;

  const directOrg = await prisma.organization.findFirst({
    where: isUuidLike(key) ? { OR: [{ id: key }, { slug: key }] } : { slug: key },
    select: { id: true },
  });

  if (directOrg?.id) {
    return String(directOrg.id);
  }

  const tenantById = await prisma.nexusTenant.findFirst({
    where: {
      OR: [{ id: key }, { subdomain: key }],
    },
    select: { ownerEmail: true, subdomain: true },
  });

  const ownerEmail = tenantById?.ownerEmail ? String(tenantById.ownerEmail) : '';
  const subdomain = tenantById?.subdomain ? String(tenantById.subdomain) : '';

  if (ownerEmail) {
    const ownerSocialUser = await prisma.organizationUser.findFirst({
      where: { email: { equals: ownerEmail, mode: 'insensitive' } },
      select: { id: true },
    });

    if (ownerSocialUser?.id) {
      const orgByOwner = await prisma.organization.findFirst({
        where: { owner_id: String(ownerSocialUser.id) },
        select: { id: true },
      });

      if (orgByOwner?.id) {
        return String(orgByOwner.id);
      }
    }
  }

  if (!subdomain) return null;

  const orgBySlug = await prisma.organization.findFirst({
    where: { slug: subdomain },
    select: { id: true },
  });

  return orgBySlug?.id ? String(orgBySlug.id) : null;
}

async function resolveTenantIdFromKey(tenantKey: string): Promise<string | null> {
  const key = String(tenantKey || '').trim();
  if (!key) return null;

  const tenant = await prisma.nexusTenant.findFirst({
    where: { OR: [{ id: key }, { subdomain: key }] },
    select: { id: true },
  });

  return tenant?.id ? String(tenant.id) : null;
}

async function deleteByUserIdScoped(params: {
  table: 'social_oauth_tokens' | 'social_webhook_configs' | 'social_user_update_views' | 'team_members';
  userId: string;
  organizationId: string;
}): Promise<{ error?: unknown }> {
  try {
    if (params.table === 'social_oauth_tokens') {
      await prisma.oAuthToken.deleteMany({ where: { user_id: params.userId } });
      return {};
    }
    if (params.table === 'social_webhook_configs') {
      await prisma.webhookConfig.deleteMany({ where: { user_id: params.userId } });
      return {};
    }
    if (params.table === 'social_user_update_views') {
      await prisma.userUpdateView.deleteMany({ where: { user_id: params.userId } });
      return {};
    }
    if (params.table === 'team_members') {
      await prisma.teamMember.deleteMany({
        where: { user_id: params.userId, organization_id: params.organizationId },
      });
      return {};
    }
    return {};
  } catch (error: unknown) {
    return { error };
  }
}

async function deleteUserRowScoped(params: { userId: string; organizationId: string }): Promise<{ error?: unknown }> {
  try {
    await prisma.organizationUser.deleteMany({
      where: { id: params.userId, organization_id: params.organizationId },
    });
    return {};
  } catch (error: unknown) {
    return { error };
  }
}

export type AdminSocialTeamUser = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'team_member';
};

export type AdminTeamUser = AdminSocialTeamUser;

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

export async function getTeam(tenantId: string): Promise<{ success: boolean; data?: AdminTeamUser[]; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck;

    const organizationId = await resolveOrganizationIdFromTenantKey(tenantId);
    if (!organizationId) {
      return createSuccessResponse([]);
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: { organization_id: organizationId },
      select: { user_id: true },
    });

    const memberIds = (teamMembers || []).map((r) => r.user_id).filter(Boolean).map((v) => String(v));

    const socialUsers = await prisma.organizationUser.findMany({
      where: { organization_id: organizationId },
      select: { id: true, clerk_user_id: true, email: true, full_name: true, role: true, organization_id: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });

    const emails = Array.from(
      new Set(
        (socialUsers || [])
          .map((u) => String(u?.email || '').trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const nexusUsersByEmail = new Map<string, { name?: string | null; email?: string | null }>();

    if (emails.length > 0) {
      const nexusUsers = await prisma.nexusUser.findMany({
        where: { email: { in: emails } },
        select: { name: true, email: true },
      });

      for (const nu of nexusUsers || []) {
        const em = String(nu?.email || '').trim().toLowerCase();
        if (!em) continue;
        nexusUsersByEmail.set(em, { name: nu?.name ?? null, email: nu?.email ?? null });
      }
    }

    const mapped: AdminSocialTeamUser[] = (socialUsers || []).map((su) => {
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

    return createSuccessResponse(mapped);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת צוות');
  }
}

export async function getSocialTeam(
  tenantId: string
): Promise<{ success: boolean; data?: AdminSocialTeamUser[]; error?: string }> {
  return await getTeam(tenantId);
}

function normalizeAutomation(input: unknown): AdminSocialAutomation {
  const obj = asObject(input) ?? {};
  return {
    enableAutoReplySystem: Boolean(obj.enableAutoReplySystem),
    allowExternalWebhooks: Boolean(obj.allowExternalWebhooks),
  };
}

export async function getSocialAutomation(
  tenantId: string
): Promise<{ success: boolean; data?: AdminSocialAutomation; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck;

    const resolvedTenantId = await resolveTenantIdFromKey(tenantId);
    if (!resolvedTenantId) {
      return createSuccessResponse(normalizeAutomation(null));
    }

    const row = await withTenantIsolationContext(
      {
        source: 'admin_social_get_social_automation',
        reason: 'read_system_settings',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.system_settings.findFirst({
          where: { tenant_id: resolvedTenantId },
          select: { id: true, system_flags: true },
          orderBy: { updated_at: 'desc' },
        })
    );

    const flags = getJsonObject(row?.system_flags);
    const automation = normalizeAutomation(flags.socialAutomation);
    return createSuccessResponse(automation);
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
    if (!adminCheck.success) return adminCheck;

    const resolvedTenantId = await resolveTenantIdFromKey(tenantId);
    if (!resolvedTenantId) {
      return createErrorResponse('Tenant not found', 'טננט לא נמצא');
    }

    await withTenantIsolationContext(
      {
        source: 'admin_social_update_social_automation',
        reason: 'write_system_settings',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        const existingRow = await prisma.system_settings.findFirst({
          where: { tenant_id: resolvedTenantId },
          select: { id: true, system_flags: true },
          orderBy: { updated_at: 'desc' },
        });

        const now = new Date();
        const nextFlags = {
          ...getJsonObject(existingRow?.system_flags),
          socialAutomation: normalizeAutomation(automation),
        };

        if (existingRow?.id) {
          await prisma.system_settings.updateMany({
            where: { id: String(existingRow.id), tenant_id: resolvedTenantId },
            data: {
              system_flags: toInputJsonValue(nextFlags),
              updated_at: now,
            },
          });
          return;
        }

        await prisma.system_settings.create({
          data: {
            tenant_id: resolvedTenantId,
            system_flags: toInputJsonValue(nextFlags),
            created_at: now,
            updated_at: now,
          },
        });
      }
    );

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשמירת אוטומציות');
  }
}

export async function updateUserRole(
  tenantId: string,
  userId: string,
  role: AdminSocialTeamUser['role']
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck;

    const resolvedRole = String(role || 'team_member');
    if (resolvedRole !== 'super_admin' && resolvedRole !== 'owner' && resolvedRole !== 'team_member') {
      return createErrorResponse('Invalid role', 'תפקיד לא תקין');
    }

    const organizationId = await resolveOrganizationIdFromTenantKey(tenantId);
    if (!organizationId) {
      return createErrorResponse('Organization not found', 'טננט לא נמצא');
    }

    const resolvedUserId = String(userId || '').trim();
    if (!resolvedUserId) {
      return createErrorResponse('Missing userId', 'משתמש לא תקין');
    }

    const userRow = await prisma.organizationUser.findFirst({
      where: { id: resolvedUserId },
      select: { id: true, organization_id: true },
    });

    if (!userRow?.id) {
      return createErrorResponse('User not found', 'משתמש לא נמצא');
    }

    if (String(userRow.organization_id || '') !== String(organizationId)) {
      return createErrorResponse('Forbidden', 'המשתמש לא שייך לטננט הזה');
    }

    await prisma.organizationUser.updateMany({
      where: { id: resolvedUserId, organization_id: organizationId },
      data: { role: resolvedRole },
    });

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בעדכון תפקיד');
  }
}

export async function updateSocialUserRole(
  tenantId: string,
  userId: string,
  role: AdminSocialTeamUser['role']
): Promise<{ success: boolean; error?: string }> {
  return await updateUserRole(tenantId, userId, role);
}

export async function removeUserFromTeam(
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck;

    const organizationId = await resolveOrganizationIdFromTenantKey(tenantId);
    if (!organizationId) {
      return createErrorResponse('Organization not found', 'טננט לא נמצא');
    }

    const resolvedUserId = String(userId || '').trim();
    if (!resolvedUserId) {
      return createErrorResponse('Missing userId', 'משתמש לא תקין');
    }

    const orgRow = await prisma.organization.findFirst({
      where: { id: organizationId },
      select: { owner_id: true },
    });

    if (String(orgRow?.owner_id || '') === resolvedUserId) {
      return createErrorResponse('Forbidden', 'לא ניתן להסיר את בעל הארגון');
    }

    const userRow = await prisma.organizationUser.findFirst({
      where: { id: resolvedUserId },
      select: { id: true, organization_id: true },
    });

    if (!userRow?.id) {
      return createErrorResponse('User not found', 'משתמש לא נמצא');
    }

    if (String(userRow.organization_id || '') !== String(organizationId)) {
      return createErrorResponse('Forbidden', 'המשתמש לא שייך לטננט הזה');
    }

    const cleanOauth = await deleteByUserIdScoped({ table: 'social_oauth_tokens', userId: resolvedUserId, organizationId });
    if (cleanOauth.error) {
      return createErrorResponse(cleanOauth.error, 'שגיאה בהסרת משתמש');
    }

    const cleanWebhooks = await deleteByUserIdScoped({ table: 'social_webhook_configs', userId: resolvedUserId, organizationId });
    if (cleanWebhooks.error) {
      return createErrorResponse(cleanWebhooks.error, 'שגיאה בהסרת משתמש');
    }

    const cleanViews = await deleteByUserIdScoped({ table: 'social_user_update_views', userId: resolvedUserId, organizationId });
    if (cleanViews.error) {
      return createErrorResponse(cleanViews.error, 'שגיאה בהסרת משתמש');
    }

    const cleanTeamMember = await deleteByUserIdScoped({ table: 'team_members', userId: resolvedUserId, organizationId });
    if (cleanTeamMember.error) {
      return createErrorResponse(cleanTeamMember.error, 'שגיאה בהסרת משתמש');
    }

    const deleteUserRow = await deleteUserRowScoped({ userId: resolvedUserId, organizationId });
    if (deleteUserRow.error) {
      return createErrorResponse(deleteUserRow.error, 'שגיאה בהסרת משתמש');
    }

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בהסרת משתמש');
  }
}

export async function removeSocialUser(
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return await removeUserFromTeam(tenantId, userId);
}

function normalizeQuotas(input: unknown): AdminSocialQuotas {
  const obj = asObject(input) ?? {};
  const maxPostsPerMonth = Number(obj.maxPostsPerMonth);
  const maxConnectedAccounts = Number(obj.maxConnectedAccounts);
  const maxTeamMembers = Number(obj.maxTeamMembers);
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
    if (!adminCheck.success) return adminCheck;

    const resolvedTenantId = await resolveTenantIdFromKey(tenantId);
    if (!resolvedTenantId) {
      return createSuccessResponse(normalizeQuotas(null));
    }

    const row = await withTenantIsolationContext(
      {
        source: 'admin_social_get_social_quotas',
        reason: 'read_system_settings',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.system_settings.findFirst({
          where: { tenant_id: resolvedTenantId },
          select: { system_flags: true },
          orderBy: { updated_at: 'desc' },
        })
    );

    const flags = getJsonObject(row?.system_flags);
    const quotas = normalizeQuotas(flags.socialQuotas);
    return createSuccessResponse(quotas);
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
    if (!adminCheck.success) return adminCheck;

    const resolvedTenantId = await resolveTenantIdFromKey(tenantId);
    if (!resolvedTenantId) {
      return createErrorResponse('Tenant not found', 'טננט לא נמצא');
    }

    await withTenantIsolationContext(
      {
        source: 'admin_social_update_social_quotas',
        reason: 'write_system_settings',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        const existingRow = await prisma.system_settings.findFirst({
          where: { tenant_id: resolvedTenantId },
          select: { id: true, system_flags: true },
          orderBy: { updated_at: 'desc' },
        });

        const now = new Date();
        const nextFlags = {
          ...getJsonObject(existingRow?.system_flags),
          socialQuotas: normalizeQuotas(quotas),
        };

        if (existingRow?.id) {
          await prisma.system_settings.updateMany({
            where: { id: String(existingRow.id), tenant_id: resolvedTenantId },
            data: {
              system_flags: toInputJsonValue(nextFlags),
              updated_at: now,
            },
          });
          return;
        }

        await prisma.system_settings.create({
          data: {
            tenant_id: resolvedTenantId,
            system_flags: toInputJsonValue(nextFlags),
            created_at: now,
            updated_at: now,
          },
        });
      }
    );

    return createSuccessResponse(true);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשמירת מכסות');
  }
}

export async function getSocialIntegrations(
  tenantId: string
): Promise<{ success: boolean; data?: AdminSocialIntegrationStatus[]; error?: string }> {
  try {
    const adminCheck = await requireSuperAdminOrFail();
    if (!adminCheck.success) return adminCheck;

    const organizationId = await resolveOrganizationIdFromTenantKey(tenantId);
    if (!organizationId) {
      return createSuccessResponse([
        { provider: 'facebook', label: 'Facebook', connected: false, tokenExpiresAt: null, connectedAt: null },
        { provider: 'instagram', label: 'Instagram', connected: false, tokenExpiresAt: null, connectedAt: null },
        { provider: 'whatsapp', label: 'WhatsApp', connected: false, tokenExpiresAt: null, connectedAt: null },
      ]);
    }

    const socialUsers = await prisma.organizationUser.findMany({
      where: { organization_id: organizationId },
      select: { id: true },
    });

    const userIds = (socialUsers || []).map((u) => String(u.id)).filter(Boolean);
    if (userIds.length === 0) {
      return createSuccessResponse([
        { provider: 'facebook', label: 'Facebook', connected: false, tokenExpiresAt: null, connectedAt: null },
        { provider: 'instagram', label: 'Instagram', connected: false, tokenExpiresAt: null, connectedAt: null },
        { provider: 'whatsapp', label: 'WhatsApp', connected: false, tokenExpiresAt: null, connectedAt: null },
      ]);
    }

    const tokens = await prisma.oAuthToken.findMany({
      where: { user_id: { in: userIds } },
      select: { integration_name: true, expires_at: true, created_at: true, updated_at: true },
    });

    const normalizeProvider = (name: string): 'facebook' | 'instagram' | 'whatsapp' | null => {
      const n = String(name || '').toLowerCase();
      if (n.includes('facebook')) return 'facebook';
      if (n.includes('instagram')) return 'instagram';
      if (n.includes('whatsapp')) return 'whatsapp';
      return null;
    };

    const latestByProvider = new Map<'facebook' | 'instagram' | 'whatsapp', (typeof tokens)[number]>();
    for (const t of tokens || []) {
      const provider = normalizeProvider(t.integration_name);
      if (!provider) continue;
      const prev = latestByProvider.get(provider);
      const tUpdated = new Date(t.updated_at || t.created_at || 0).getTime();
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

    return createSuccessResponse(result);
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
    if (!adminCheck.success) return adminCheck;

    const organizationId = await resolveOrganizationIdFromTenantKey(tenantId);
    if (!organizationId) {
      return createErrorResponse('Organization not found', 'טננט לא נמצא');
    }

    const socialUsers = await prisma.organizationUser.findMany({
      where: { organization_id: organizationId },
      select: { id: true },
    });

    const userIds = (socialUsers || []).map((u) => String(u?.id || '')).filter(Boolean);
    if (userIds.length === 0) {
      return createSuccessResponse({ deleted: 0 });
    }

    const providerLike = String(provider || '').toLowerCase();
    const deleted = await prisma.oAuthToken.deleteMany({
      where: {
        user_id: { in: userIds },
        integration_name: { contains: providerLike, mode: 'insensitive' },
      },
    });

    return createSuccessResponse({ deleted: Number(deleted.count || 0) });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בניתוק אינטגרציה');
  }
}
