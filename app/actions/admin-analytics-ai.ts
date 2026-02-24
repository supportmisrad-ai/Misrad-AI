'use server';

import prisma from '@/lib/prisma';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────

export interface AIUsageOverview {
  totalRequests: number;
  totalCostCents: number;
  avgLatencyMs: number;
  successRate: number;
  errorCount: number;
  uniqueUsers: number;
  uniqueOrganizations: number;
  topFeatures: { featureKey: string; count: number; costCents: number }[];
  topModels: { provider: string; model: string; displayName: string | null; count: number; costCents: number; avgLatencyMs: number }[];
  topOrganizations: { orgId: string; orgName: string; count: number; costCents: number }[];
  topUsers: { userId: string; userName: string | null; email: string | null; count: number; costCents: number }[];
  dailyUsage: { date: string; requests: number; costCents: number; errors: number }[];
  taskKindBreakdown: { taskKind: string; count: number; costCents: number }[];
  statusBreakdown: { status: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
}

export interface AIUsageLogEntry {
  id: string;
  createdAt: string;
  organizationName: string;
  userName: string | null;
  userEmail: string | null;
  featureKey: string;
  taskKind: string;
  provider: string;
  model: string;
  modelDisplayName: string | null;
  chargedCents: number;
  latencyMs: number | null;
  status: string;
  errorMessage: string | null;
}

export interface CustomerAnalyticsOverview {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  cancelledOrganizations: number;
  totalUsers: number;
  totalTeamMembers: number;
  avgUsersPerOrg: number;
  totalMRR: number;
  moduleDistribution: { module: string; count: number; percentage: number }[];
  planDistribution: { plan: string; count: number; percentage: number }[];
  statusDistribution: { status: string; count: number }[];
  topOrganizations: {
    id: string;
    name: string;
    plan: string | null;
    status: string | null;
    usersCount: number;
    modulesCount: number;
    aiRequestsCount: number;
    aiCostCents: number;
    createdAt: string;
    lastActivity: string | null;
  }[];
  dailySignups: { date: string; count: number }[];
  recentOrganizations: {
    id: string;
    name: string;
    plan: string | null;
    ownerName: string | null;
    ownerEmail: string | null;
    createdAt: string;
  }[];
  moduleUsageByPlan: { plan: string; modules: Record<string, number> }[];
}

export interface CustomerActivityEntry {
  orgId: string;
  orgName: string;
  plan: string | null;
  status: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  usersCount: number;
  teamMembersCount: number;
  activeModules: string[];
  aiRequestsLast30d: number;
  aiCostLast30d: number;
  createdAt: string;
  lastAiActivity: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────

async function ensureAdmin() {
  const auth = await requireAuth();
  if (!auth.success) throw new Error(auth.error || 'נדרשת התחברות');
  await requireSuperAdmin();
}

const MODULE_LABELS: Record<string, string> = {
  nexus: 'Nexus',
  social: 'Social',
  system: 'System',
  finance: 'Finance',
  client: 'Client',
  operations: 'Operations',
};

// ── AI Usage Actions ─────────────────────────────────────────────

export async function getAIUsageOverview(days: number = 30): Promise<{
  success: boolean;
  data?: AIUsageOverview;
  error?: string;
}> {
  try {
    await ensureAdmin();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.ai_usage_logs.findMany({
      where: { created_at: { gte: since } },
      select: {
        id: true,
        created_at: true,
        organization_id: true,
        user_id: true,
        feature_key: true,
        task_kind: true,
        provider: true,
        model: true,
        model_display_name: true,
        charged_cents: true,
        latency_ms: true,
        status: true,
        error_message: true,
        organizations: { select: { name: true } },
      },
    });

    const totalRequests = logs.length;
    const totalCostCents = logs.reduce((sum, l) => sum + l.charged_cents, 0);
    const logsWithLatency = logs.filter((l) => l.latency_ms !== null && l.latency_ms > 0);
    const avgLatencyMs = logsWithLatency.length > 0
      ? Math.round(logsWithLatency.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / logsWithLatency.length)
      : 0;
    const successLogs = logs.filter((l) => l.status === 'success');
    const errorCount = logs.filter((l) => l.status === 'error').length;
    const successRate = totalRequests > 0 ? Math.round((successLogs.length / totalRequests) * 100 * 10) / 10 : 0;
    const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
    const uniqueOrganizations = new Set(logs.map((l) => l.organization_id)).size;

    // Top features
    const featureMap = new Map<string, { count: number; costCents: number }>();
    for (const l of logs) {
      const existing = featureMap.get(l.feature_key) || { count: 0, costCents: 0 };
      existing.count++;
      existing.costCents += l.charged_cents;
      featureMap.set(l.feature_key, existing);
    }
    const topFeatures = Array.from(featureMap.entries())
      .map(([featureKey, data]) => ({ featureKey, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Top models
    const modelMap = new Map<string, { provider: string; model: string; displayName: string | null; count: number; costCents: number; totalLatency: number; latencyCount: number }>();
    for (const l of logs) {
      const key = `${l.provider}::${l.model}`;
      const existing = modelMap.get(key) || { provider: l.provider, model: l.model, displayName: l.model_display_name, count: 0, costCents: 0, totalLatency: 0, latencyCount: 0 };
      existing.count++;
      existing.costCents += l.charged_cents;
      if (l.latency_ms && l.latency_ms > 0) {
        existing.totalLatency += l.latency_ms;
        existing.latencyCount++;
      }
      modelMap.set(key, existing);
    }
    const topModels = Array.from(modelMap.values())
      .map((d) => ({
        provider: d.provider,
        model: d.model,
        displayName: d.displayName,
        count: d.count,
        costCents: d.costCents,
        avgLatencyMs: d.latencyCount > 0 ? Math.round(d.totalLatency / d.latencyCount) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top organizations
    const orgMap = new Map<string, { orgName: string; count: number; costCents: number }>();
    for (const l of logs) {
      const existing = orgMap.get(l.organization_id) || { orgName: l.organizations.name, count: 0, costCents: 0 };
      existing.count++;
      existing.costCents += l.charged_cents;
      orgMap.set(l.organization_id, existing);
    }
    const topOrganizations = Array.from(orgMap.entries())
      .map(([orgId, data]) => ({ orgId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top users - fetch user info
    const userCountMap = new Map<string, { count: number; costCents: number }>();
    for (const l of logs) {
      const existing = userCountMap.get(l.user_id) || { count: 0, costCents: 0 };
      existing.count++;
      existing.costCents += l.charged_cents;
      userCountMap.set(l.user_id, existing);
    }
    const topUserIds = Array.from(userCountMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([uid]) => uid);

    const userInfos = topUserIds.length > 0
      ? await prisma.organizationUser.findMany({
          where: { clerk_user_id: { in: topUserIds } },
          select: { clerk_user_id: true, full_name: true, email: true },
        })
      : [];
    const userInfoMap = new Map(userInfos.map((u) => [u.clerk_user_id, u]));
    const topUsers = topUserIds.map((uid) => {
      const info = userInfoMap.get(uid);
      const data = userCountMap.get(uid)!;
      return {
        userId: uid,
        userName: info?.full_name || null,
        email: info?.email || null,
        count: data.count,
        costCents: data.costCents,
      };
    });

    // Daily usage
    const dayMap = new Map<string, { requests: number; costCents: number; errors: number }>();
    for (const l of logs) {
      const day = l.created_at.toISOString().split('T')[0];
      const existing = dayMap.get(day) || { requests: 0, costCents: 0, errors: 0 };
      existing.requests++;
      existing.costCents += l.charged_cents;
      if (l.status === 'error') existing.errors++;
      dayMap.set(day, existing);
    }
    const dailyUsage = Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Task kind breakdown
    const taskMap = new Map<string, { count: number; costCents: number }>();
    for (const l of logs) {
      const existing = taskMap.get(l.task_kind) || { count: 0, costCents: 0 };
      existing.count++;
      existing.costCents += l.charged_cents;
      taskMap.set(l.task_kind, existing);
    }
    const taskKindBreakdown = Array.from(taskMap.entries())
      .map(([taskKind, data]) => ({ taskKind, ...data }))
      .sort((a, b) => b.count - a.count);

    // Status breakdown
    const statusMap = new Map<string, number>();
    for (const l of logs) {
      statusMap.set(l.status, (statusMap.get(l.status) || 0) + 1);
    }
    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Hourly distribution
    const hourMap = new Map<number, number>();
    for (const l of logs) {
      const hour = l.created_at.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
    const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourMap.get(i) || 0,
    }));

    return createSuccessResponse({
      totalRequests,
      totalCostCents,
      avgLatencyMs,
      successRate,
      errorCount,
      uniqueUsers,
      uniqueOrganizations,
      topFeatures,
      topModels,
      topOrganizations,
      topUsers,
      dailyUsage,
      taskKindBreakdown,
      statusBreakdown,
      hourlyDistribution,
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת נתוני שימוש AI');
  }
}

export async function getAIUsageLogs(options: {
  days?: number;
  limit?: number;
  featureKey?: string;
  status?: string;
}): Promise<{
  success: boolean;
  data?: AIUsageLogEntry[];
  error?: string;
}> {
  try {
    await ensureAdmin();

    const days = options.days || 30;
    const limit = options.limit || 200;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Record<string, unknown> = { created_at: { gte: since } };
    if (options.featureKey) where.feature_key = options.featureKey;
    if (options.status) where.status = options.status;

    const logs = await prisma.ai_usage_logs.findMany({
      where,
      include: {
        organizations: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    const userIds = [...new Set(logs.map((l) => l.user_id))];
    const users = userIds.length > 0
      ? await prisma.organizationUser.findMany({
          where: { clerk_user_id: { in: userIds } },
          select: { clerk_user_id: true, full_name: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.clerk_user_id, u]));

    const result: AIUsageLogEntry[] = logs.map((l) => {
      const user = userMap.get(l.user_id);
      return {
        id: l.id,
        createdAt: l.created_at.toISOString(),
        organizationName: l.organizations.name,
        userName: user?.full_name || null,
        userEmail: user?.email || null,
        featureKey: l.feature_key,
        taskKind: l.task_kind,
        provider: l.provider,
        model: l.model,
        modelDisplayName: l.model_display_name,
        chargedCents: l.charged_cents,
        latencyMs: l.latency_ms,
        status: l.status,
        errorMessage: l.error_message,
      };
    });

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת לוגי AI');
  }
}

// ── Customer Analytics Actions ───────────────────────────────────

export async function getCustomerAnalyticsOverview(days: number = 90): Promise<{
  success: boolean;
  data?: CustomerAnalyticsOverview;
  error?: string;
}> {
  try {
    await ensureAdmin();

    const since = new Date();
    since.setDate(since.getDate() - days);
    const last30d = new Date();
    last30d.setDate(last30d.getDate() - 30);

    const [organizations, allUsers, allTeamMembers, aiLogsLast30d] = await Promise.all([
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          subscription_plan: true,
          subscription_status: true,
          has_nexus: true,
          has_social: true,
          has_system: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
          active_users_count: true,
          mrr: true,
          created_at: true,
          owner: { select: { full_name: true, email: true } },
          _count: {
            select: {
              organizationUsers: true,
              teamMembers: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.organizationUser.count(),
      prisma.teamMember.count(),
      prisma.ai_usage_logs.findMany({
        where: { created_at: { gte: last30d } },
        select: {
          organization_id: true,
          charged_cents: true,
          created_at: true,
        },
      }),
    ]);

    const totalOrganizations = organizations.length;
    const activeOrganizations = organizations.filter((o) => o.subscription_status === 'active').length;
    const trialOrganizations = organizations.filter((o) => o.subscription_status === 'trial').length;
    const cancelledOrganizations = organizations.filter((o) => o.subscription_status === 'cancelled').length;
    const totalUsers = allUsers;
    const totalTeamMembers = allTeamMembers;
    const avgUsersPerOrg = totalOrganizations > 0 ? Math.round((totalUsers / totalOrganizations) * 10) / 10 : 0;
    const totalMRR = organizations.reduce((sum, o) => sum + Number(o.mrr || 0), 0);

    // Module distribution
    const moduleFlags: [string, keyof typeof organizations[0]][] = [
      ['nexus', 'has_nexus'],
      ['social', 'has_social'],
      ['system', 'has_system'],
      ['finance', 'has_finance'],
      ['client', 'has_client'],
      ['operations', 'has_operations'],
    ];
    const moduleDistribution = moduleFlags.map(([mod, flag]) => {
      const count = organizations.filter((o) => o[flag] === true).length;
      return {
        module: MODULE_LABELS[mod] || mod,
        count,
        percentage: totalOrganizations > 0 ? Math.round((count / totalOrganizations) * 100) : 0,
      };
    }).sort((a, b) => b.count - a.count);

    // Plan distribution
    const planMap = new Map<string, number>();
    for (const o of organizations) {
      const plan = o.subscription_plan || 'ללא חבילה';
      planMap.set(plan, (planMap.get(plan) || 0) + 1);
    }
    const planDistribution = Array.from(planMap.entries())
      .map(([plan, count]) => ({
        plan,
        count,
        percentage: totalOrganizations > 0 ? Math.round((count / totalOrganizations) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Status distribution
    const statusMap = new Map<string, number>();
    for (const o of organizations) {
      const status = o.subscription_status || 'לא ידוע';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }
    const statusDistribution = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // AI usage per org (last 30 days)
    const aiOrgMap = new Map<string, { count: number; costCents: number; lastActivity: Date | null }>();
    for (const l of aiLogsLast30d) {
      const existing = aiOrgMap.get(l.organization_id) || { count: 0, costCents: 0, lastActivity: null };
      existing.count++;
      existing.costCents += l.charged_cents;
      if (!existing.lastActivity || l.created_at > existing.lastActivity) {
        existing.lastActivity = l.created_at;
      }
      aiOrgMap.set(l.organization_id, existing);
    }

    // Top organizations (by AI usage + size)
    const topOrganizations = organizations
      .map((o) => {
        const aiData = aiOrgMap.get(o.id);
        const modules = moduleFlags.filter(([, flag]) => o[flag] === true).length;
        return {
          id: o.id,
          name: o.name,
          plan: o.subscription_plan,
          status: o.subscription_status,
          usersCount: o._count.organizationUsers,
          modulesCount: modules,
          aiRequestsCount: aiData?.count || 0,
          aiCostCents: aiData?.costCents || 0,
          createdAt: o.created_at?.toISOString() || '',
          lastActivity: aiData?.lastActivity?.toISOString() || null,
        };
      })
      .sort((a, b) => b.aiRequestsCount - a.aiRequestsCount)
      .slice(0, 20);

    // Daily signups
    const signupDayMap = new Map<string, number>();
    for (const o of organizations) {
      if (o.created_at && o.created_at >= since) {
        const day = o.created_at.toISOString().split('T')[0];
        signupDayMap.set(day, (signupDayMap.get(day) || 0) + 1);
      }
    }
    const dailySignups = Array.from(signupDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent organizations
    const recentOrganizations = organizations.slice(0, 15).map((o) => ({
      id: o.id,
      name: o.name,
      plan: o.subscription_plan,
      ownerName: o.owner.full_name,
      ownerEmail: o.owner.email,
      createdAt: o.created_at?.toISOString() || '',
    }));

    // Module usage by plan
    const planModuleMap = new Map<string, Record<string, number>>();
    for (const o of organizations) {
      const plan = o.subscription_plan || 'ללא חבילה';
      const existing = planModuleMap.get(plan) || {};
      for (const [mod, flag] of moduleFlags) {
        if (o[flag] === true) {
          existing[mod] = (existing[mod] || 0) + 1;
        }
      }
      planModuleMap.set(plan, existing);
    }
    const moduleUsageByPlan = Array.from(planModuleMap.entries())
      .map(([plan, modules]) => ({ plan, modules }));

    return createSuccessResponse({
      totalOrganizations,
      activeOrganizations,
      trialOrganizations,
      cancelledOrganizations,
      totalUsers,
      totalTeamMembers,
      avgUsersPerOrg,
      totalMRR,
      moduleDistribution,
      planDistribution,
      statusDistribution,
      topOrganizations,
      dailySignups,
      recentOrganizations,
      moduleUsageByPlan,
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת נתוני לקוחות');
  }
}

export async function getCustomerActivityList(): Promise<{
  success: boolean;
  data?: CustomerActivityEntry[];
  error?: string;
}> {
  try {
    await ensureAdmin();

    const last30d = new Date();
    last30d.setDate(last30d.getDate() - 30);

    const [organizations, aiLogs] = await Promise.all([
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          subscription_plan: true,
          subscription_status: true,
          has_nexus: true,
          has_social: true,
          has_system: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
          created_at: true,
          owner: { select: { full_name: true, email: true } },
          _count: {
            select: {
              organizationUsers: true,
              teamMembers: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.ai_usage_logs.findMany({
        where: { created_at: { gte: last30d } },
        select: {
          organization_id: true,
          charged_cents: true,
          created_at: true,
        },
      }),
    ]);

    const aiOrgMap = new Map<string, { count: number; costCents: number; lastActivity: Date | null }>();
    for (const l of aiLogs) {
      const existing = aiOrgMap.get(l.organization_id) || { count: 0, costCents: 0, lastActivity: null };
      existing.count++;
      existing.costCents += l.charged_cents;
      if (!existing.lastActivity || l.created_at > existing.lastActivity) {
        existing.lastActivity = l.created_at;
      }
      aiOrgMap.set(l.organization_id, existing);
    }

    const moduleFlags: [string, 'has_nexus' | 'has_social' | 'has_system' | 'has_finance' | 'has_client' | 'has_operations'][] = [
      ['nexus', 'has_nexus'],
      ['social', 'has_social'],
      ['system', 'has_system'],
      ['finance', 'has_finance'],
      ['client', 'has_client'],
      ['operations', 'has_operations'],
    ];

    const result: CustomerActivityEntry[] = organizations.map((o) => {
      const aiData = aiOrgMap.get(o.id);
      const activeModules = moduleFlags
        .filter(([, flag]) => o[flag] === true)
        .map(([mod]) => MODULE_LABELS[mod] || mod);

      return {
        orgId: o.id,
        orgName: o.name,
        plan: o.subscription_plan,
        status: o.subscription_status,
        ownerName: o.owner.full_name,
        ownerEmail: o.owner.email,
        usersCount: o._count.organizationUsers,
        teamMembersCount: o._count.teamMembers,
        activeModules,
        aiRequestsLast30d: aiData?.count || 0,
        aiCostLast30d: aiData?.costCents || 0,
        createdAt: o.created_at?.toISOString() || '',
        lastAiActivity: aiData?.lastActivity?.toISOString() || null,
      };
    });

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת רשימת פעילות לקוחות');
  }
}

// ── Realtime Activity ────────────────────────────────────────────

export interface RealtimeActivity {
  activeUsersNow: number;
  activeOrgsNow: number;
  activeSiteVisitorsNow: number;
  hourlyActivity: { hour: string; aiRequests: number; siteVisitors: number; uniqueUsers: number }[];
  recentActiveUsers: { userId: string; userName: string | null; email: string | null; orgName: string; lastActivityAt: string }[];
}

export async function getRealtimeActivity(): Promise<{
  success: boolean;
  data?: RealtimeActivity;
  error?: string;
}> {
  try {
    await ensureAdmin();

    const now = new Date();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentAiLogsP = prisma.ai_usage_logs.findMany({
      where: { created_at: { gte: fifteenMinAgo } },
      select: {
        user_id: true,
        organization_id: true,
        created_at: true,
        organizations: { select: { name: true } },
      },
    });
    const recentSiteSessionsP = prisma.siteAnalyticsSession.findMany({
      where: { updated_at: { gte: fifteenMinAgo } },
      select: { visitor_id: true },
    });
    const last24hAiLogsP = prisma.ai_usage_logs.findMany({
      where: { created_at: { gte: twentyFourHoursAgo } },
      select: {
        user_id: true,
        organization_id: true,
        created_at: true,
        organizations: { select: { name: true } },
      },
    });
    const last24hSiteSessionsP = prisma.siteAnalyticsSession.findMany({
      where: { created_at: { gte: twentyFourHoursAgo } },
      select: { visitor_id: true, created_at: true },
    });

    const recentAiLogs = await recentAiLogsP;
    const recentSiteSessions = await recentSiteSessionsP;
    const last24hAiLogs = await last24hAiLogsP;
    const last24hSiteSessions = await last24hSiteSessionsP;

    // Active now (last 15 min)
    const activeUserIds = new Set<string>(recentAiLogs.map((l) => l.user_id));
    const activeOrgIds = new Set<string>(recentAiLogs.map((l) => l.organization_id));
    const activeSiteVisitors = new Set<string>(recentSiteSessions.map((s) => s.visitor_id));

    // Recent active users (last 15 min) — fetch names
    const userIds: string[] = [...activeUserIds];
    const userInfos = userIds.length > 0
      ? await prisma.organizationUser.findMany({
          where: { clerk_user_id: { in: userIds } },
          select: { clerk_user_id: true, full_name: true, email: true },
        })
      : [];
    const userInfoMap = new Map(userInfos.map((u) => [u.clerk_user_id, u]));

    // Build recent active users list (deduplicated, sorted by most recent)
    const userLastActivity = new Map<string, { orgName: string; lastAt: Date }>();
    for (const l of recentAiLogs) {
      const existing = userLastActivity.get(l.user_id);
      if (!existing || l.created_at > existing.lastAt) {
        userLastActivity.set(l.user_id, { orgName: l.organizations.name, lastAt: l.created_at });
      }
    }
    const recentActiveUsers = Array.from(userLastActivity.entries())
      .sort((a, b) => b[1].lastAt.getTime() - a[1].lastAt.getTime())
      .slice(0, 10)
      .map(([uid, data]) => {
        const info = userInfoMap.get(uid);
        return {
          userId: uid,
          userName: info?.full_name || null,
          email: info?.email || null,
          orgName: data.orgName,
          lastActivityAt: data.lastAt.toISOString(),
        };
      });

    // 24-hour hourly breakdown
    const hourlyMap = new Map<string, { aiRequests: number; siteVisitors: Set<string>; uniqueUsers: Set<string> }>();
    // Initialize all 24 hours
    for (let i = 0; i < 24; i++) {
      const h = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const key = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}T${String(h.getHours()).padStart(2, '0')}`;
      hourlyMap.set(key, { aiRequests: 0, siteVisitors: new Set(), uniqueUsers: new Set() });
    }

    for (const l of last24hAiLogs) {
      const d = l.created_at;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}`;
      const existing = hourlyMap.get(key);
      if (existing) {
        existing.aiRequests++;
        existing.uniqueUsers.add(l.user_id);
      }
    }

    for (const s of last24hSiteSessions) {
      const d = s.created_at;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}`;
      const existing = hourlyMap.get(key);
      if (existing) {
        existing.siteVisitors.add(s.visitor_id);
      }
    }

    const hourlyActivity = Array.from(hourlyMap.entries())
      .map(([key, data]) => ({
        hour: key.split('T')[1] + ':00',
        aiRequests: data.aiRequests,
        siteVisitors: data.siteVisitors.size,
        uniqueUsers: data.uniqueUsers.size,
      }));

    return createSuccessResponse({
      activeUsersNow: activeUserIds.size,
      activeOrgsNow: activeOrgIds.size,
      activeSiteVisitorsNow: activeSiteVisitors.size,
      hourlyActivity,
      recentActiveUsers,
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת נתוני פעילות בזמן אמת');
  }
}

// ── AI Insights Generator ────────────────────────────────────────

export interface AIGeneratedInsight {
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  description: string;
}

export async function generateAIInsights(days: number = 30): Promise<{
  success: boolean;
  data?: AIGeneratedInsight[];
  error?: string;
}> {
  try {
    await ensureAdmin();

    const since = new Date();
    since.setDate(since.getDate() - days);
    const prevSince = new Date();
    prevSince.setDate(prevSince.getDate() - days * 2);

    const [currentLogs, prevLogs, orgs] = await Promise.all([
      prisma.ai_usage_logs.findMany({
        where: { created_at: { gte: since } },
        select: {
          organization_id: true,
          user_id: true,
          feature_key: true,
          charged_cents: true,
          status: true,
          latency_ms: true,
          created_at: true,
        },
      }),
      prisma.ai_usage_logs.findMany({
        where: { created_at: { gte: prevSince, lt: since } },
        select: {
          organization_id: true,
          charged_cents: true,
          status: true,
        },
      }),
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          subscription_status: true,
          subscription_plan: true,
          has_nexus: true,
          has_social: true,
          has_system: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
          created_at: true,
          _count: { select: { organizationUsers: true } },
        },
      }),
    ]);

    const insights: AIGeneratedInsight[] = [];

    // 1. Usage trend
    const currentCount = currentLogs.length;
    const prevCount = prevLogs.length;
    if (prevCount > 0) {
      const changePercent = Math.round(((currentCount - prevCount) / prevCount) * 100);
      if (changePercent > 20) {
        insights.push({
          type: 'success',
          title: `שימוש ב-AI עלה ב-${changePercent}%`,
          description: `${currentCount.toLocaleString('he-IL')} בקשות ב-${days} ימים לעומת ${prevCount.toLocaleString('he-IL')} בתקופה הקודמת. צמיחה בריאה!`,
        });
      } else if (changePercent < -20) {
        insights.push({
          type: 'warning',
          title: `שימוש ב-AI ירד ב-${Math.abs(changePercent)}%`,
          description: `${currentCount.toLocaleString('he-IL')} בקשות ב-${days} ימים לעומת ${prevCount.toLocaleString('he-IL')} בתקופה הקודמת. כדאי לבדוק.`,
        });
      }
    }

    // 2. Cost trend
    const currentCost = currentLogs.reduce((s, l) => s + l.charged_cents, 0);
    const prevCost = prevLogs.reduce((s, l) => s + l.charged_cents, 0);
    if (prevCost > 0) {
      const costChange = Math.round(((currentCost - prevCost) / prevCost) * 100);
      if (costChange > 30) {
        insights.push({
          type: 'warning',
          title: `עלות AI עלתה ב-${costChange}%`,
          description: `₪${(currentCost / 100).toFixed(2)} ב-${days} ימים לעומת ₪${(prevCost / 100).toFixed(2)} בתקופה הקודמת.`,
        });
      }
    }

    // 3. Error rate
    const errorCount = currentLogs.filter((l) => l.status === 'error').length;
    const errorRate = currentCount > 0 ? (errorCount / currentCount) * 100 : 0;
    if (errorRate > 5) {
      insights.push({
        type: 'danger',
        title: `שיעור שגיאות גבוה: ${errorRate.toFixed(1)}%`,
        description: `${errorCount} שגיאות מתוך ${currentCount} בקשות. מומלץ לבדוק את הלוגים.`,
      });
    } else if (errorRate < 1 && currentCount > 10) {
      insights.push({
        type: 'success',
        title: `אמינות מצוינת: ${(100 - errorRate).toFixed(1)}% הצלחה`,
        description: `רק ${errorCount} שגיאות מתוך ${currentCount} בקשות ב-${days} ימים.`,
      });
    }

    // 4. High latency
    const highLatencyLogs = currentLogs.filter((l) => l.latency_ms && l.latency_ms > 10000);
    if (highLatencyLogs.length > currentCount * 0.1 && highLatencyLogs.length > 5) {
      insights.push({
        type: 'warning',
        title: `${highLatencyLogs.length} בקשות עם זמן תגובה גבוה`,
        description: `${Math.round((highLatencyLogs.length / currentCount) * 100)}% מהבקשות לוקחות מעל 10 שניות. בדוק את המודלים.`,
      });
    }

    // 5. Inactive organizations
    const orgWithAI = new Set(currentLogs.map((l) => l.organization_id));
    const activeOrgs = orgs.filter((o) => o.subscription_status === 'active' || o.subscription_status === 'trial');
    const inactiveOrgs = activeOrgs.filter((o) => !orgWithAI.has(o.id));
    if (inactiveOrgs.length > 0 && activeOrgs.length > 0) {
      const inactivePct = Math.round((inactiveOrgs.length / activeOrgs.length) * 100);
      insights.push({
        type: 'info',
        title: `${inactiveOrgs.length} ארגונים פעילים לא משתמשים ב-AI`,
        description: `${inactivePct}% מהארגונים הפעילים לא השתמשו ב-AI ב-${days} הימים האחרונים. הזדמנות לאימוץ.`,
      });
    }

    // 6. Top feature concentration
    const featureMap = new Map<string, number>();
    for (const l of currentLogs) {
      featureMap.set(l.feature_key, (featureMap.get(l.feature_key) || 0) + 1);
    }
    const topFeature = Array.from(featureMap.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topFeature && currentCount > 10) {
      const concentration = Math.round((topFeature[1] / currentCount) * 100);
      if (concentration > 60) {
        insights.push({
          type: 'info',
          title: `ריכוז גבוה: ${topFeature[0]} (${concentration}%)`,
          description: `פיצ'ר ${topFeature[0]} מייצר ${concentration}% מכל השימוש. שאר הפיצ'רים מנוצלים פחות.`,
        });
      }
    }

    // 7. Single-user orgs with high usage (power users)
    const userOrgMap = new Map<string, Set<string>>();
    for (const l of currentLogs) {
      const users = userOrgMap.get(l.organization_id) || new Set<string>();
      users.add(l.user_id);
      userOrgMap.set(l.organization_id, users);
    }
    const singleUserPowerOrgs = Array.from(userOrgMap.entries())
      .filter(([, users]) => users.size === 1)
      .length;
    if (singleUserPowerOrgs > 0 && orgWithAI.size > 2) {
      insights.push({
        type: 'info',
        title: `${singleUserPowerOrgs} ארגונים עם משתמש AI יחיד`,
        description: `אימוץ AI באותם ארגונים מרוכז במשתמש אחד. הזדמנות לגדילה פנים-ארגונית.`,
      });
    }

    // 8. New organizations
    const recentOrgs = orgs.filter((o) => o.created_at && o.created_at >= since);
    if (recentOrgs.length > 0) {
      insights.push({
        type: 'success',
        title: `${recentOrgs.length} ארגונים חדשים ב-${days} ימים`,
        description: `ארגונים שנוספו: ${recentOrgs.slice(0, 3).map((o) => o.name).join(', ')}${recentOrgs.length > 3 ? ' ועוד...' : ''}`,
      });
    }

    // 9. Module adoption
    const moduleFlags: [string, keyof typeof orgs[0]][] = [
      ['nexus', 'has_nexus'],
      ['social', 'has_social'],
      ['system', 'has_system'],
      ['finance', 'has_finance'],
      ['client', 'has_client'],
      ['operations', 'has_operations'],
    ];
    const leastUsedModule = moduleFlags
      .map(([mod, flag]) => ({
        mod,
        count: orgs.filter((o) => o[flag] === true).length,
      }))
      .sort((a, b) => a.count - b.count)[0];
    if (leastUsedModule && orgs.length > 3) {
      insights.push({
        type: 'info',
        title: `המודול הכי פחות מאומץ: ${MODULE_LABELS[leastUsedModule.mod] || leastUsedModule.mod}`,
        description: `רק ${leastUsedModule.count} מתוך ${orgs.length} ארגונים משתמשים בו (${Math.round((leastUsedModule.count / orgs.length) * 100)}%).`,
      });
    }

    return createSuccessResponse(insights);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה ביצירת תובנות AI');
  }
}
