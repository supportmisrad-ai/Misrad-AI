'use server';



import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/server/logger';
import prisma, { queryRawAllowlisted } from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { requireSuperAdmin } from '@/lib/auth';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { Prisma } from '@prisma/client';

import { asObjectLoose as asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';

function isOSModuleKey(value: unknown): value is OSModuleKey {
  return (
    value === 'nexus' ||
    value === 'system' ||
    value === 'social' ||
    value === 'finance' ||
    value === 'client' ||
    value === 'operations'
  );
}

function getClerkUserCreatedAtIso(clerkUser: unknown): string | null {
  const obj = asObject(clerkUser);
  const raw = obj?.createdAt;
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof raw === 'string') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/**
 * Get live KPIs for Overview & Pulse screen
 */
export async function getLiveKPIs(): Promise<{
  success: boolean;
  data?: {
    usersRegisteredToday: number;
    usersRegisteredThisWeek: number;
    activeClientsOnline: number;
    totalMRR: number;
    dailyAICost: number;
    criticalErrors: unknown[];
    securityAlerts: unknown[];
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    // Get users registered today and this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Prisma-first: activity_logs table is not modeled in Prisma.
    // Use Clerk as the source of truth for registration metrics.
    let usersRegisteredToday = 0;
    let usersRegisteredThisWeek = 0;
    try {
      const client = await clerkClient();
      const clerkUsersResponse = await client.users.getUserList({ limit: 500 });
      const users = Array.isArray(clerkUsersResponse.data) ? (clerkUsersResponse.data as unknown[]) : [];
      for (const u of users) {
        const createdAtIso = getClerkUserCreatedAtIso(u);
        if (!createdAtIso) continue;
        const createdAt = new Date(createdAtIso);
        if (createdAt >= today) usersRegisteredToday++;
        if (createdAt >= weekAgo) usersRegisteredThisWeek++;
      }
    } catch {
      // keep 0s
    }

    // Get active clients + MRR via DB aggregation (avoid loading all clients into memory)
    const aggRows = await queryRawAllowlisted<
      Array<{
        active_clients_online: unknown;
        total_mrr: unknown;
      }>
    >(prisma, {
      reason: 'admin_cockpit_client_clients_agg',
      query: `
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(metadata->>'status', '') = 'Active') AS active_clients_online,
        COALESCE(
          SUM(COALESCE(NULLIF((metadata->>'monthlyFee'), '')::numeric, 0)),
          0
        ) AS total_mrr
      FROM client_clients;
    `,
      values: [],
    });

    const agg = Array.isArray(aggRows) && aggRows.length > 0 ? aggRows[0] : null;
    const activeClientsOnline = agg?.active_clients_online == null ? 0 : Number(agg.active_clients_online);
    const totalMRR = agg?.total_mrr == null ? 0 : Number(agg.total_mrr);

    const metricsRow = await prisma.globalSystemMetric.findFirst({
      select: { gemini_token_usage: true },
      orderBy: { created_at: 'desc' },
    });

    // Estimate daily cost (rough calculation: ~$0.00001 per token)
    const geminiTokens = metricsRow?.gemini_token_usage == null ? 0 : Number(metricsRow.gemini_token_usage);
    const dailyAICost = geminiTokens * 0.00001;

    // Prisma-first: activity_logs is not available via Prisma.
    const errors: unknown[] = [];
    const securityAlerts: unknown[] = [];

    return createSuccessResponse({
      usersRegisteredToday,
      usersRegisteredThisWeek,
      activeClientsOnline,
      totalMRR,
      dailyAICost,
      criticalErrors: errors || [],
      securityAlerts: securityAlerts || [],
    });
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בקבלת KPIs חיים');
  }
}

/**
 * Get all system users (from Clerk and sync with DB)
 */
export async function getAllUsers(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    registeredAt: string;
    lastActivity: string;
    isBanned: boolean;
  }>;
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    const user = await currentUser();
    if (!user) {
      return createErrorResponse(null, 'לא מאומת');
    }

    // Get all users from Clerk
    const client = await clerkClient();
    let clerkUsers: unknown[] = [];
    try {
      const clerkUsersResponse = await client.users.getUserList({ limit: 500 });
      clerkUsers = Array.isArray(clerkUsersResponse.data) ? (clerkUsersResponse.data as unknown[]) : [];
      logger.debug('getAllUsers', 'Found', clerkUsers.length, 'users in Clerk');
    } catch (clerkError: unknown) {
      logger.error('getAllUsers', 'Error fetching users from Clerk:', clerkError);
      // Continue with Supabase users only
    }

    const teamMembers = await prisma.nexusUser.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Build a map of existing users by email for quick lookup
    const existingEmails = new Set(
      (Array.isArray(teamMembers) ? teamMembers : [])
        .map((m) => {
          const email = asObject(m)?.email;
          return typeof email === 'string' ? email.toLowerCase() : null;
        })
        .filter((v): v is string => Boolean(v))
    );
    logger.debug('getAllUsers', 'Existing emails in Supabase:', Array.from(existingEmails));
    
    // Sync Clerk users with Supabase - create missing entries
    const { getOrCreateSupabaseUserAction } = await import('./users');
    let syncedCount = 0;
    
    for (const clerkUser of clerkUsers) {
      const clerkObj = asObject(clerkUser) ?? {};
      const emailAddresses = clerkObj.emailAddresses;
      const firstEmail = Array.isArray(emailAddresses) && emailAddresses.length > 0 ? asObject(emailAddresses[0])?.emailAddress : null;
      const email = typeof firstEmail === 'string' ? firstEmail : null;
      if (!email) {
        logger.debug('getAllUsers', 'Skipping user without email:', String(clerkObj.id ?? ''));
        continue;
      }
      
      const emailLower = email.toLowerCase();
      const existsInSupabase = existingEmails.has(emailLower);
      
      logger.debug('getAllUsers', 'Checking user:', {
        email,
        clerkId: String(clerkObj.id ?? ''),
        existsInSupabase,
        firstName: clerkObj.firstName,
        lastName: clerkObj.lastName,
      });
      
      if (!existsInSupabase) {
        // User exists in Clerk but not in Supabase - create it
        try {
          logger.debug('getAllUsers', '🔄 Syncing user from Clerk to Supabase:', email);
          const firstName = clerkObj.firstName ? String(clerkObj.firstName) : '';
          const lastName = clerkObj.lastName ? String(clerkObj.lastName) : '';
          const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'User';
          const clerkUserId = String(clerkObj.id ?? '');
          
          const supabaseResult = await getOrCreateSupabaseUserAction(
            clerkUserId,
            email,
            fullName,
            typeof clerkObj.imageUrl === 'string' ? clerkObj.imageUrl : undefined
          );
          
          logger.debug('getAllUsers', 'getOrCreateSupabaseUserAction result:', {
            success: supabaseResult.success,
            userId: supabaseResult.userId,
            error: supabaseResult.error,
          });
          
          if (supabaseResult.success && supabaseResult.userId) {
            const socialRow = await prisma.organizationUser.findFirst({
              where: { clerk_user_id: clerkUserId },
              select: { organization_id: true },
            });

            const organizationId = socialRow?.organization_id ? String(socialRow.organization_id) : '';
            if (!organizationId) {
              logger.warn('getAllUsers', 'Skipping sync: missing organization_id for clerk user', {
                clerkUserId,
                email,
              });
              continue;
            }

            // Check if user already exists in nexus_users by (organizationId, email)
            const normalizedEmail = email.trim().toLowerCase();
            const existingMember = await prisma.nexusUser.findFirst({
              where: { 
                organizationId,
                email: normalizedEmail,
              },
              select: { id: true },
            });

            if (existingMember?.id) {
              logger.debug('getAllUsers', '✓ User already exists in nexus_users:', email);
              continue;
            }

            const now = new Date();
            
            // Prepare user data
            const createdAtIso = getClerkUserCreatedAtIso(clerkUser);
            const createdAt = createdAtIso ? new Date(createdAtIso) : now;

            await prisma.nexusUser.create({
              data: {
                organizationId,
                name: fullName,
                email: normalizedEmail,
                role: 'account_manager',
                avatar: typeof clerkObj.imageUrl === 'string' && clerkObj.imageUrl ? clerkObj.imageUrl : '',
                createdAt,
              } satisfies Prisma.NexusUserCreateInput,
            });

            logger.debug('getAllUsers', '✅ Synced user to nexus_users:', email);
            syncedCount++;
            existingEmails.add(emailLower);
          } else {
            logger.error('getAllUsers', '❌ Failed to create user in Supabase:', supabaseResult.error);
          }
        } catch (syncError: unknown) {
          logger.error('getAllUsers', '❌ Error syncing user:', email, syncError);
          logger.error('getAllUsers', 'Error details:', {
            message: getUnknownErrorMessage(syncError),
            stack: asObject(syncError)?.stack,
          });
          // Continue with other users
        }
      } else {
        logger.debug('getAllUsers', '✓ User already exists in Supabase:', email);
      }
    }
    
    logger.debug('getAllUsers', 'Synced', syncedCount, 'users from Clerk to Supabase');
    
    // Get updated team members after sync
    const updatedTeamMembers = await prisma.nexusUser.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Get last SquareActivity for each user
    const usersWithActivity = await Promise.all(
      (Array.isArray(updatedTeamMembers) ? updatedTeamMembers : []).map(async (member) => {
        const memberObj = asObject(member) ?? {};
        const memberId = String(memberObj.id ?? '');
        const createdAt = memberObj.createdAt ? String(memberObj.createdAt) : new Date().toISOString();
        const lastActivityAt = null;

        return {
          id: memberId,
          name: String(memberObj.name ?? ''),
          email: memberObj.email ? String(memberObj.email) : 'אין דוא"ל',
          role: memberObj.role ? String(memberObj.role) : 'user',
          plan: 'free',
          registeredAt: createdAt,
          lastActivity: lastActivityAt || createdAt,
          isBanned: false,
        };
      })
    );

    return createSuccessResponse(usersWithActivity);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בקבלת משתמשים');
  }
}

/**
 * Ban/Suspend user
 */
export async function banUser(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    return createErrorResponse(null, 'פעולה לא נתמכת: אין שדה חסימה ב-nexus_users');
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בחסימת משתמש');
  }
}

/**
 * Grant PRO access to user
 */
export async function grantProAccess(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    return createErrorResponse(null, 'פעולה לא נתמכת: אין שדה plan ב-nexus_users');
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בשדרוג משתמש');
  }
}

/**
 * Get deleted items (soft deletes) for Recycle Bin
 */
export async function getDeletedItems(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    type: 'post' | 'client';
    name: string;
    clientName: string;
    deletedAt: string;
    deletedBy: string;
  }>;
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    const posts = await prisma.socialPost.findMany({
      where: { deleted_at: { not: null } },
      select: {
        id: true,
        content: true,
        deleted_at: true,
        deleted_by: true,
        clientId: true,
      },
      orderBy: { deleted_at: 'desc' },
      take: 200,
    });

    const clientIds = Array.from(new Set((posts || []).map((p) => String(p.clientId || '')).filter(Boolean)));
    const clientNamesById = new Map<string, string>();
    if (clientIds.length > 0) {
      const clientRows = await prisma.clients.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, company_name: true },
      });
      for (const c of clientRows || []) {
        clientNamesById.set(String(c.id), String(c.company_name || ''));
      }
    }

    const deletedItems = [
      ...posts.map((p) => {
        const content = p.content == null ? '' : String(p.content);
        const deletedAt = p.deleted_at == null ? new Date().toISOString() : String(p.deleted_at);
        const deletedBy = p.deleted_by == null ? 'מערכת' : String(p.deleted_by);
        const clientName = clientNamesById.get(String(p.clientId || '')) || 'לא ידוע';
        return {
          id: String(p.id ?? ''),
          type: 'post' as const,
          name: (content.substring(0, 50) || 'פוסט').trim() || 'פוסט',
          clientName,
          deletedAt,
          deletedBy,
        };
      }),
    ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

    return createSuccessResponse(deletedItems);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בקבלת פריטים שנמחקו');
  }
}

/**
 * Restore deleted item
 */
export async function restoreDeletedItem(
  itemId: string,
  itemType: 'post' | 'client'
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    if (itemType === 'client') {
      return createErrorResponse(null, 'Restore client לא נתמך כרגע (Prisma schema חסר deleted_at/deleted_by עבור client_clients)');
    }

    const post = await prisma.socialPost.findUnique({ where: { id: itemId }, select: { id: true, clientId: true } });
    const clientIdForPost = post?.clientId ? String(post.clientId) : '';
    if (!clientIdForPost) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: post ללא client_id לא ניתן לשחזור');
    }

    const legacyClient = await prisma.clients.findUnique({ where: { id: clientIdForPost }, select: { organization_id: true } });
    const organizationId = legacyClient?.organization_id ? String(legacyClient.organization_id) : '';
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: post ללא organization_id (דרך client) לא ניתן לשחזור');
    }

    await prisma.socialPost.updateMany({
      where: { id: itemId, clientId: clientIdForPost },
      data: { deleted_at: null, deleted_by: null } satisfies Prisma.SocialPostUpdateManyMutationInput,
    });

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בהחזרת פריט');
  }
}

/**
 * Hard delete item (permanent)
 */
export async function hardDeleteItem(
  itemId: string,
  itemType: 'post' | 'client'
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    if (itemType === 'client') {
      const existing = await prisma.clientClient.findUnique({ where: { id: itemId }, select: { id: true, organizationId: true } });
      const organizationId = existing?.organizationId ? String(existing.organizationId) : '';
      if (!organizationId) {
        return createErrorResponse(null, 'Tenant Isolation lockdown: client ללא organization_id לא ניתן למחיקה');
      }
      await prisma.clientClient.deleteMany({ where: { id: itemId, organizationId } });
      revalidatePath('/', 'layout');
      return createSuccessResponse(true);
    }

    const post = await prisma.socialPost.findUnique({ where: { id: itemId }, select: { id: true, clientId: true } });
    const clientIdForPost = post?.clientId ? String(post.clientId) : '';
    if (!clientIdForPost) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: post ללא client_id לא ניתן למחיקה');
    }

    const legacyClient = await prisma.clients.findUnique({ where: { id: clientIdForPost }, select: { organization_id: true } });
    const organizationId = legacyClient?.organization_id ? String(legacyClient.organization_id) : '';
    if (!organizationId) {
      return createErrorResponse(null, 'Tenant Isolation lockdown: post ללא organization_id (דרך client) לא ניתן למחיקה');
    }

    await prisma.socialPost.deleteMany({ where: { id: itemId, clientId: clientIdForPost } });

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה במחיקה קבועה');
  }
}

/**
 * Get feature usage analytics
 */
export async function getFeatureUsageAnalytics(): Promise<{
  success: boolean;
  data?: {
    buttonClicks: unknown[];
    aiSatisfaction: {
      copied: number;
      retried: number;
      satisfactionRate: number;
    };
    feedback: unknown[];
    churnedUsers: Array<{
      id: string;
      name: string;
      email: string;
      lastActive: string;
      daysSinceActive: number;
    }>;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    // Prisma-first: activity_logs is not modeled in Prisma.
    const buttonClicks: unknown[] = [];
    const copied = 0;
    const retried = 0;
    const total = copied + retried;
    const satisfactionRate = total > 0 ? (copied / total) * 100 : 0;

    const feedback = await prisma.socialMediaFeedback.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // Get churned users (no SquareActivity for 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const users = await prisma.nexusUser.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
    });
    const churnedUsers = await Promise.all(
      users.map(async (user) => {
        const userObj = asObject(user) ?? {};
        const userId = String(userObj.id ?? '');
        const createdAtStr = userObj.createdAt == null ? new Date().toISOString() : String(userObj.createdAt);
        const lastActive = new Date(createdAtStr);

        if (lastActive < weekAgo) {
          return {
            id: userId,
            name: String(userObj.name ?? ''),
            email: String(userObj.email ?? ''),
            lastActive: lastActive.toISOString(),
            daysSinceActive: Math.floor((Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000)),
          };
        }
        return null;
      })
    );

    return createSuccessResponse({
      buttonClicks: buttonClicks || [],
      aiSatisfaction: {
        copied,
        retried,
        satisfactionRate,
      },
      feedback: feedback || [],
      churnedUsers: churnedUsers.filter((u): u is NonNullable<typeof u> => u !== null),
    });
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בקבלת ניתוח שימוש');
  }
}

/**
 * Get system feature flags
 */
export async function getFeatureFlags(): Promise<{
  success: boolean;
  data?: {
    maintenanceMode: boolean;
    aiEnabled: boolean;
    bannerMessage: string | null;
    fullOfficeRequiresFinance: boolean;
    enable_payment_manual: boolean;
    enable_payment_credit_card: boolean;
    launch_scope_modules: Record<OSModuleKey, boolean>;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    const flags = await prisma.coreSystemSettings
      .findUnique({ where: { key: 'feature_flags' }, select: { value: true, maintenance_mode: true, ai_enabled: true, banner_message: true } })
      .catch((error: unknown) => {
        if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] social_system_settings feature_flags lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/admin-cockpit.getFeatureFlags',
            reason: 'coreSystemSettings feature_flags lookup schema mismatch (fallback to defaults)',
            error,
          });
        }
        return null;
      });

    const flagsObj = asObject(flags) ?? {};
    const rawValue = flagsObj.value;
    let parsedValue: unknown = null;
    if (typeof rawValue === 'string' && rawValue) {
      parsedValue = JSON.parse(rawValue);
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    const parsedObj = asObject(parsedValue) ?? {};

    return createSuccessResponse({
      maintenanceMode: Boolean(parsedObj.maintenanceMode ?? flagsObj.maintenance_mode ?? false),
      aiEnabled: Boolean(parsedObj.aiEnabled ?? (flagsObj.ai_enabled !== false)),
      bannerMessage: parsedObj.bannerMessage == null ? (flagsObj.banner_message == null ? null : String(flagsObj.banner_message)) : String(parsedObj.bannerMessage),
      fullOfficeRequiresFinance: Boolean(parsedObj.fullOfficeRequiresFinance ?? false),
      enable_payment_manual: Boolean(parsedObj.enable_payment_manual ?? parsedObj.enablePaymentManual ?? true),
      enable_payment_credit_card: Boolean(parsedObj.enable_payment_credit_card ?? parsedObj.enablePaymentCreditCard ?? false),
      launch_scope_modules: (() => {
        const defaults: Record<OSModuleKey, boolean> = {
          nexus: true,
          system: true,
          social: true,
          finance: true,
          client: true,
          operations: true,
        };
        const raw = parsedObj.launch_scope_modules ?? parsedObj.launchScopeModules;
        const rawObj = asObject(raw);
        if (!rawObj) return defaults;
        return {
          nexus: Boolean(rawObj.nexus ?? defaults.nexus),
          system: Boolean(rawObj.system ?? defaults.system),
          social: Boolean(rawObj.social ?? defaults.social),
          finance: Boolean(rawObj.finance ?? defaults.finance),
          client: Boolean(rawObj.client ?? defaults.client),
          operations: Boolean(rawObj.operations ?? defaults.operations),
        };
      })(),
    });
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] social_system_settings feature_flags lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
      );
    }

    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/admin-cockpit.getFeatureFlags',
        reason: 'coreSystemSettings feature_flags lookup schema mismatch (fallback to defaults)',
        error,
      });
    }
    // If table doesn't exist, return defaults
    return createSuccessResponse({
      maintenanceMode: false,
      aiEnabled: true,
      bannerMessage: null,
      fullOfficeRequiresFinance: false,
      enable_payment_manual: true,
      enable_payment_credit_card: false,
      launch_scope_modules: {
        nexus: true,
        system: true,
        social: true,
        finance: true,
        client: true,
        operations: true,
      },
    });
  }
}

/**
 * Update feature flags
 */
export async function updateFeatureFlags(
  flags: {
    maintenanceMode?: boolean;
    aiEnabled?: boolean;
    bannerMessage?: string | null;
    fullOfficeRequiresFinance?: boolean;
    enable_payment_manual?: boolean;
    enable_payment_credit_card?: boolean;
    launch_scope_modules?: Partial<Record<OSModuleKey, boolean>> | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    const existing = await prisma.coreSystemSettings
      .findUnique({ where: { key: 'feature_flags' }, select: { value: true, maintenance_mode: true, ai_enabled: true, banner_message: true } })
      .catch((error: unknown) => {
        if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] social_system_settings feature_flags lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/admin-cockpit.updateFeatureFlags',
            reason: 'coreSystemSettings feature_flags lookup schema mismatch (fallback to defaults)',
            error,
          });
        }
        return null;
      });

    const existingObj = asObject(existing) ?? {};
    const existingRaw = existingObj.value;
    let existingValue: unknown = null;
    if (typeof existingRaw === 'string' && existingRaw) {
      existingValue = JSON.parse(existingRaw);
    } else if (existingRaw && typeof existingRaw === 'object') {
      existingValue = existingRaw;
    }
    const existingValueObj = asObject(existingValue) ?? {};

    const defaultScope: Record<OSModuleKey, boolean> = {
      nexus: true,
      system: true,
      social: true,
      finance: true,
      client: true,
      operations: true,
    };

    const existingScopeRaw = existingValueObj.launch_scope_modules ?? existingValueObj.launchScopeModules;
    const existingScopeObj = asObject(existingScopeRaw);
    const existingScope = !existingScopeObj
      ? defaultScope
      : {
          nexus: Boolean(existingScopeObj.nexus ?? defaultScope.nexus),
          system: Boolean(existingScopeObj.system ?? defaultScope.system),
          social: Boolean(existingScopeObj.social ?? defaultScope.social),
          finance: Boolean(existingScopeObj.finance ?? defaultScope.finance),
          client: Boolean(existingScopeObj.client ?? defaultScope.client),
          operations: Boolean(existingScopeObj.operations ?? defaultScope.operations),
        };

    const requestedScopeRaw = flags.launch_scope_modules;
    const requestedScopeObj = asObject(requestedScopeRaw);
    const requestedScope = !requestedScopeObj
      ? null
      : {
          nexus: Boolean(requestedScopeObj.nexus ?? existingScope.nexus),
          system: Boolean(requestedScopeObj.system ?? existingScope.system),
          social: Boolean(requestedScopeObj.social ?? existingScope.social),
          finance: Boolean(requestedScopeObj.finance ?? existingScope.finance),
          client: Boolean(requestedScopeObj.client ?? existingScope.client),
          operations: Boolean(requestedScopeObj.operations ?? existingScope.operations),
        };

    const nextFlags = {
      maintenanceMode: Boolean(flags.maintenanceMode ?? existingValueObj.maintenanceMode ?? existingObj.maintenance_mode ?? false),
      aiEnabled: Boolean(flags.aiEnabled ?? existingValueObj.aiEnabled ?? (existingObj.ai_enabled !== false)),
      bannerMessage: (flags.bannerMessage ?? existingValueObj.bannerMessage ?? existingObj.banner_message ?? null) as string | null,
      fullOfficeRequiresFinance: Boolean(flags.fullOfficeRequiresFinance ?? existingValueObj.fullOfficeRequiresFinance ?? false),
      enable_payment_manual: Boolean(flags.enable_payment_manual ?? existingValueObj.enable_payment_manual ?? existingValueObj.enablePaymentManual ?? true),
      enable_payment_credit_card: Boolean(flags.enable_payment_credit_card ?? existingValueObj.enable_payment_credit_card ?? existingValueObj.enablePaymentCreditCard ?? false),
      launch_scope_modules: requestedScope ?? existingScope,
    };

    const nextFlagsJson = JSON.parse(JSON.stringify(nextFlags)) as Prisma.InputJsonObject;

    await withTenantIsolationContext(
      {
        source: 'admin_cockpit_update_feature_flags',
        reason: 'upsert_feature_flags',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.coreSystemSettings.upsert({
          where: { key: 'feature_flags' },
          create: {
            key: 'feature_flags',
            maintenance_mode: nextFlags.maintenanceMode,
            ai_enabled: nextFlags.aiEnabled,
            banner_message: nextFlags.bannerMessage,
            value: nextFlagsJson,
            updated_at: new Date(),
          },
          update: {
            maintenance_mode: nextFlags.maintenanceMode,
            ai_enabled: nextFlags.aiEnabled,
            banner_message: nextFlags.bannerMessage,
            value: nextFlagsJson,
            updated_at: new Date(),
          },
        })
    );

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בעדכון הגדרות');
  }
}

export async function getSystemEmailSettings(): Promise<{
  success: boolean;
  data?: {
    supportEmail: string | null;
    migrationEmail: string | null;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    const row = await prisma.coreSystemSettings
      .findUnique({ where: { key: 'system_email_settings' }, select: { value: true } })
      .catch((error: unknown) => {
        if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] social_system_settings system_email_settings lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/admin-cockpit.getSystemEmailSettings',
            reason: 'coreSystemSettings system_email_settings lookup schema mismatch (fallback to env defaults)',
            error,
          });
        }
        return null;
      });

    const rowObj = asObject(row) ?? {};
    const rawValue = rowObj.value;
    let parsedValue: unknown = null;
    if (typeof rawValue === 'string' && rawValue) {
      parsedValue = JSON.parse(rawValue);
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }
    const parsedObj = asObject(parsedValue) ?? {};

    const supportEmailFallback = (process.env.MISRAD_SUPPORT_EMAIL || 'support@misrad-ai.com,itsikdahan1@gmail.com').trim();
    const migrationEmailFallback = (process.env.MISRAD_MIGRATION_EMAIL || '').trim();

    const supportEmailRaw = (parsedObj.supportEmail ?? supportEmailFallback);
    const migrationEmailRaw = (parsedObj.migrationEmail ?? migrationEmailFallback);

    const supportEmail = String(supportEmailRaw ?? '').trim() || null;
    const migrationEmail = String(migrationEmailRaw ?? '').trim() || null;

    return createSuccessResponse({
      supportEmail,
      migrationEmail,
    });
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] social_system_settings system_email_settings lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
      );
    }

    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/admin-cockpit.getSystemEmailSettings',
        reason: 'coreSystemSettings system_email_settings lookup schema mismatch (fallback to env defaults)',
        error,
      });
    }
    const supportEmailFallback = (process.env.MISRAD_SUPPORT_EMAIL || 'support@misrad-ai.com,itsikdahan1@gmail.com').trim();
    const migrationEmailFallback = (process.env.MISRAD_MIGRATION_EMAIL || '').trim();
    return createSuccessResponse({
      supportEmail: supportEmailFallback || null,
      migrationEmail: migrationEmailFallback || null,
    });
  }
}

export async function updateSystemEmailSettings(input: {
  supportEmail?: string | null;
  migrationEmail?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    const existing = await prisma.coreSystemSettings
      .findUnique({ where: { key: 'system_email_settings' }, select: { value: true } })
      .catch((error: unknown) => {
        if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] social_system_settings system_email_settings lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/admin-cockpit.updateSystemEmailSettings',
            reason: 'coreSystemSettings system_email_settings lookup schema mismatch (fallback to defaults)',
            error,
          });
        }
        return null;
      });

    const existingObj = asObject(existing) ?? {};
    const existingRaw = existingObj.value;
    let existingValue: unknown = null;
    if (typeof existingRaw === 'string' && existingRaw) {
      existingValue = JSON.parse(existingRaw);
    } else if (existingRaw && typeof existingRaw === 'object') {
      existingValue = existingRaw;
    }

    const existingValueObj = asObject(existingValue) ?? {};

    const supportEmail = input.supportEmail === undefined ? existingValueObj.supportEmail : input.supportEmail;
    const migrationEmail = input.migrationEmail === undefined ? existingValueObj.migrationEmail : input.migrationEmail;

    const nextValue = {
      supportEmail: supportEmail ? String(supportEmail).trim() : null,
      migrationEmail: migrationEmail ? String(migrationEmail).trim() : null,
    };

    const nextValueJson = JSON.parse(JSON.stringify(nextValue)) as Prisma.InputJsonObject;
    await withTenantIsolationContext(
      {
        source: 'admin_cockpit_update_system_email_settings',
        reason: 'upsert_system_email_settings',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.coreSystemSettings.upsert({
          where: { key: 'system_email_settings' },
          create: { key: 'system_email_settings', value: nextValueJson, updated_at: new Date() },
          update: { value: nextValueJson, updated_at: new Date() },
        })
    );

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בעדכון אימיילים מערכתיים');
  }
}

export async function getModuleIcons(): Promise<{
  success: boolean;
  data?: Partial<Record<OSModuleKey, string>>;
  error?: string;
}> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    const row = await prisma.coreSystemSettings
      .findUnique({ where: { key: 'module_icons' }, select: { value: true } })
      .catch((error: unknown) => {
        if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] social_system_settings module_icons lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/admin-cockpit.getModuleIcons',
            reason: 'coreSystemSettings module_icons lookup schema mismatch (fallback to empty object)',
            error,
          });
        }
        return null;
      });

    const rowObj = asObject(row) ?? {};
    const rawValue = rowObj.value;
    let parsedValue: unknown = null;
    if (typeof rawValue === 'string' && rawValue) {
      parsedValue = JSON.parse(rawValue);
    } else if (rawValue && typeof rawValue === 'object') {
      parsedValue = rawValue;
    }

    const parsedObj = asObject(parsedValue) ?? {};
    const out: Partial<Record<OSModuleKey, string>> = {};
    for (const [k, v] of Object.entries(parsedObj)) {
      if (isOSModuleKey(k) && typeof v === 'string') {
        out[k] = v;
      }
    }
    return createSuccessResponse(out);
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] social_system_settings module_icons lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
      );
    }

    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/admin-cockpit.getModuleIcons',
        reason: 'coreSystemSettings module_icons lookup schema mismatch (fallback to empty object)',
        error,
      });
    }
    return createSuccessResponse({});
  }
}

export async function updateModuleIcons(params: {
  moduleIcons: Partial<Record<OSModuleKey, string>>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();
    const existing = await prisma.coreSystemSettings
      .findUnique({ where: { key: 'module_icons' }, select: { value: true } })
      .catch((error: unknown) => {
        if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(
            `[SchemaMismatch] social_system_settings module_icons lookup failed (${getUnknownErrorMessage(error) || 'missing relation'})`
          );
        }

        if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'app/actions/admin-cockpit.updateModuleIcons',
            reason: 'coreSystemSettings module_icons lookup schema mismatch (fallback to defaults)',
            error,
          });
        }
        return null;
      });

    const existingObj = asObject(existing) ?? {};
    const existingRaw = existingObj.value;
    let existingValue: unknown = null;
    if (typeof existingRaw === 'string' && existingRaw) {
      existingValue = JSON.parse(existingRaw);
    } else if (existingRaw && typeof existingRaw === 'object') {
      existingValue = existingRaw;
    }

    const existingValueObj = asObject(existingValue) ?? {};
    const existingStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(existingValueObj)) {
      if (typeof v === 'string') existingStrings[k] = v;
    }

    const nextValue: Record<string, string> = { ...existingStrings };
    for (const [k, v] of Object.entries(params.moduleIcons)) {
      if (v != null) {
        nextValue[k] = String(v);
      }
    }

    const nextValueJson = JSON.parse(JSON.stringify(nextValue)) as Prisma.InputJsonObject;
    await withTenantIsolationContext(
      {
        source: 'admin_cockpit_update_module_icons',
        reason: 'upsert_module_icons',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () =>
        await prisma.coreSystemSettings.upsert({
          where: { key: 'module_icons' },
          create: { key: 'module_icons', value: nextValueJson, updated_at: new Date() },
          update: { value: nextValueJson, updated_at: new Date() },
        })
    );

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בעדכון אייקוני מודולים');
  }
}

/**
 * Send "we miss you" email to churned users
 */
export async function sendChurnEmail(
  userIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }

    await requireSuperAdmin();

    revalidatePath('/', 'layout');

    return createSuccessResponse(true);
  } catch (error: unknown) {
    return createErrorResponse(error, getUnknownErrorMessage(error) || 'שגיאה בשליחת מיילים');
  }
}

