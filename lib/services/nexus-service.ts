import 'server-only';

import * as React from 'react';

import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/auth';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import type { WorkspaceInfo } from '@/lib/server/workspace';
import { getNexusOnboardingTemplate } from '@/lib/services/nexus-onboarding-service';
import { getNexusBillingItems } from '@/lib/services/nexus-billing-service';

type ActionPriority = 'urgent' | 'high' | 'normal';

type DashboardAction = {
  id: string;
  source: 'nexus' | 'system' | 'social';
  title: string;
  subtitle: string;
  href: string;
  priority: ActionPriority;
};

type WorkspaceEntitlements = Awaited<ReturnType<typeof requireWorkspaceAccessByOrgSlug>>['entitlements'];

type NexusKpis = {
  entitlements: WorkspaceEntitlements;
  generatedAt: string;
  nexus?: { tasksOpen: number; tasksUrgent: number };
  system?: { leadsTotal: number; leadsHot: number; leadsIncoming: number };
  social?: { postsTotal: number; postsDraft: number; postsScheduled: number; postsPublished: number };
  client?: { clientsTotal: number };
  finance?: { totalMinutes: number; totalHours: number } | { locked: true };
};

export type NexusOwnerDashboardData = {
  workspace: { id: string; name: string; slug: string | null };
  entitlements: WorkspaceEntitlements;
  kpis: NexusKpis;
  nextActions: DashboardAction[];
};

export type NexusDashboardBootstrap = {
  workspace: WorkspaceInfo;
  ownerDashboard: NexusOwnerDashboardData;
  onboardingTemplateKey?: string | null;
  billingItems?: unknown[] | null;
};

const reactCache: unknown = Reflect.get(React, 'cache');
type CacheFn = <Args extends readonly unknown[], R>(fn: (...args: Args) => R) => (...args: Args) => R;
function identityCache<Args extends readonly unknown[], R>(fn: (...args: Args) => R): (...args: Args) => R {
  return fn;
}

const cache: CacheFn = typeof reactCache === 'function' ? (reactCache as CacheFn) : identityCache;

async function buildNexusOwnerDashboardDataForWorkspace(params: {
  orgSlug: string;
  workspace: WorkspaceInfo;
}): Promise<NexusOwnerDashboardData> {
  const { orgSlug, workspace } = params;
  const entitlements = workspace.entitlements;

  const actions: DashboardAction[] = [];

  const kpis: NexusKpis = {
    entitlements,
    generatedAt: new Date().toISOString(),
  };

  if (entitlements.nexus) {
    const openWhere = {
      organizationId: String(workspace.id),
      status: { notIn: ['Done', 'done', 'Completed', 'completed', 'Canceled', 'canceled', 'Cancelled', 'cancelled'] },
    };

    const urgentWhere = {
      ...openWhere,
      priority: { in: ['urgent', 'Urgent'] },
    };

    const [tasksOpen, tasksUrgent, urgentTasks] = await Promise.all([
      prisma.nexusTask.count({ where: openWhere }),
      prisma.nexusTask.count({ where: urgentWhere }),
      prisma.nexusTask.findMany({
        where: urgentWhere,
        select: { id: true, title: true, dueDate: true, createdAt: true },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 4,
      }),
    ]);

    kpis.nexus = {
      tasksOpen,
      tasksUrgent,
    };

    urgentTasks.forEach((t) => {
      actions.push({
        id: `nexus-task-${t.id}`,
        source: 'nexus',
        title: t.title || 'משימה דחופה',
        subtitle: 'Nexus · משימה דחופה',
        href: `/w/${encodeURIComponent(orgSlug)}/nexus/tasks?taskId=${encodeURIComponent(String(t.id))}`,
        priority: 'urgent',
      });
    });
  }

  if (entitlements.system) {
    const [leadsTotal, leadsHot, leadsIncoming, hotLeads] = await Promise.all([
      prisma.systemLead.count({ where: { organizationId: workspace.id } }),
      prisma.systemLead.count({ where: { organizationId: workspace.id, isHot: true } }),
      prisma.systemLead.count({
        where: { organizationId: workspace.id, status: { equals: 'incoming', mode: 'insensitive' } },
      }),
      prisma.systemLead.findMany({
        where: { organizationId: workspace.id, isHot: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 3,
        select: { id: true, name: true, company: true },
      }),
    ]);

    kpis.system = {
      leadsTotal,
      leadsHot,
      leadsIncoming,
    };

    hotLeads.forEach((l) => {
      const leadId = String(l.id);
      actions.push({
        id: `system-lead-${leadId}`,
        source: 'system',
        title: `${l.name || 'ליד חם'}${l.company ? ` · ${l.company}` : ''}`,
        subtitle: 'System · ליד חם',
        href: `/w/${encodeURIComponent(orgSlug)}/system?leadId=${encodeURIComponent(leadId)}`,
        priority: 'high',
      });
    });
  }

  if (entitlements.social) {
    const orgId = String(workspace.id);
    const [postsTotal, postsDraft, postsScheduled, postsPublished, scheduledPosts] = await Promise.all([
      prisma.socialPost.count({ where: { organizationId: orgId } }),
      prisma.socialPost.count({ where: { organizationId: orgId, status: { equals: 'draft', mode: 'insensitive' } } }),
      prisma.socialPost.count({
        where: { organizationId: orgId, status: { equals: 'scheduled', mode: 'insensitive' } },
      }),
      prisma.socialPost.count({
        where: { organizationId: orgId, status: { equals: 'published', mode: 'insensitive' } },
      }),
      prisma.socialPost.findMany({
        where: { organizationId: orgId, status: { equals: 'scheduled', mode: 'insensitive' } },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
    ]);

    kpis.social = {
      postsTotal,
      postsDraft,
      postsScheduled,
      postsPublished,
    };

    scheduledPosts.forEach((p) => {
      actions.push({
        id: `social-post-${p.id}`,
        source: 'social',
        title: 'פוסט מתוזמן ממתין לפרסום',
        subtitle: 'Social · Scheduled',
        href: `/w/${encodeURIComponent(orgSlug)}/social`,
        priority: 'normal',
      });
    });
  }

  if (entitlements.client) {
    const count = await prisma.clientClient.count({ where: { organizationId: workspace.id } });

    kpis.client = {
      clientsTotal: typeof count === 'number' ? count : 0,
    };
  }

  if (entitlements.finance) {
    const canViewFinancials = await hasPermission('view_financials');

    if (canViewFinancials) {
      const agg = await prisma.nexusTimeEntry.aggregate({
        where: { organizationId: String(workspace.id) },
        _sum: { durationMinutes: true },
      });
      const total = Number(agg._sum?.durationMinutes ?? 0) || 0;

      kpis.finance = {
        totalMinutes: total,
        totalHours: Math.round((total / 60) * 10) / 10,
      };
    } else {
      kpis.finance = {
        locked: true,
      };
    }
  }

  actions.sort((a, b) => {
    const order: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
    return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
  });

  return {
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug ?? null },
    entitlements,
    kpis,
    nextActions: actions.slice(0, 10),
  };
}

export async function getNexusDashboardBootstrap(params: { orgSlug: string }): Promise<NexusDashboardBootstrap> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

  const [ownerDashboard, onboarding, billing] = await Promise.all([
    buildNexusOwnerDashboardDataForWorkspace({ orgSlug: params.orgSlug, workspace }),
    getNexusOnboardingTemplate(workspace.id).catch(() => undefined),
    getNexusBillingItems(workspace.id).catch(() => undefined),
  ]);

  return {
    workspace,
    ownerDashboard,
    onboardingTemplateKey: onboarding?.key ? String(onboarding.key) : onboarding === undefined ? undefined : null,
    billingItems: Array.isArray(billing?.items) ? (billing.items as unknown[]) : billing === undefined ? undefined : null,
  };
}

export const getNexusDashboardBootstrapCached = cache(getNexusDashboardBootstrap);

export async function getNexusOwnerDashboardData(orgSlug: string): Promise<NexusOwnerDashboardData> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  return await buildNexusOwnerDashboardDataForWorkspace({ orgSlug, workspace });
}
