import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { workspaceTenantGuard } from '@/lib/api-workspace-tenant-guard';
import { asObject } from '@/lib/shared/unknown';

 type WorkspaceEntitlements = {
  nexus?: boolean;
  system?: boolean;
  social?: boolean;
  finance?: boolean;
  [key: string]: unknown;
 };

type OwnerDashboardAction = {
  id: string;
  source: 'nexus' | 'system' | 'social' | 'finance' | 'client';
  title: string;

  subtitle?: string;
  href?: string;
  priority: 'urgent' | 'high' | 'normal';
};

function readGroupByCountAll(row: unknown): number {
  const obj = asObject(row) ?? {};
  const count = asObject(obj._count) ?? {};
  const n = Number(count._all);
  return Number.isFinite(n) ? n : 0;
}

async function GETHandler(
  _req: Request,
  ctx: {
    params: { orgSlug: string };
    workspace?: { id: string; name?: string; slug?: string | null; entitlements?: WorkspaceEntitlements };
  }
) {
  const resolvedParams = await Promise.resolve(ctx.params);
  const { orgSlug } = resolvedParams;

  const workspace = ctx.workspace;
  if (!workspace?.id) {
    return NextResponse.json({ error: 'Missing workspace context' }, { status: 400 });
  }

  const entitlementsObj = asObject(workspace.entitlements) ?? {};
  const entitlements: WorkspaceEntitlements = {
    ...entitlementsObj,
    nexus: Boolean(entitlementsObj.nexus),
    system: Boolean(entitlementsObj.system),
    social: Boolean(entitlementsObj.social),
    finance: Boolean(entitlementsObj.finance),
  };

  const actions: OwnerDashboardAction[] = [];

  const kpis: Record<string, unknown> = {
    entitlements,
    generatedAt: new Date().toISOString(),
  };

  // -----------------------------
  // Nexus (Tasks)
  // -----------------------------
  if (entitlements.nexus) {
    const openWhere = {
      organizationId: String(workspace.id),
      status: { notIn: ['Done', 'done', 'Completed', 'completed', 'Canceled', 'canceled', 'Cancelled', 'cancelled'] },
    };

    const urgentWhere = {
      ...openWhere,
      priority: { in: ['urgent', 'Urgent'] },
    };

    const [taskCounts, urgentTasks] = await prisma.$transaction([
      prisma.nexusTask.groupBy({
        by: ['priority'],
        where: openWhere,
        orderBy: { priority: 'asc' },
        _count: { _all: true },
      }),
      prisma.nexusTask.findMany({
        where: urgentWhere,
        select: { id: true, title: true, dueDate: true, createdAt: true },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 4,
      }),
    ]);

    let tasksOpen = 0;
    let tasksUrgent = 0;
    for (const row of taskCounts) {
      const n = readGroupByCountAll(row);
      tasksOpen += n;
      if (String(row?.priority || '').toLowerCase() === 'urgent') {
        tasksUrgent += n;
      }
    }

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

  // -----------------------------
  // System (Leads)
  // -----------------------------
  if (entitlements.system) {
    const [leadCounts, hotLeads] = await prisma.$transaction([
      prisma.systemLead.groupBy({
        by: ['status', 'isHot'],
        where: { organizationId: workspace.id },
        _count: { _all: true },
        orderBy: [{ status: 'asc' }, { isHot: 'asc' }],
      }),
      prisma.systemLead.findMany({
        where: { organizationId: workspace.id, isHot: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 3,
        select: { id: true, name: true, company: true },
      }),
    ]);

    let leadsTotal = 0;
    let leadsHot = 0;
    let leadsIncoming = 0;
    for (const row of leadCounts) {
      const n = readGroupByCountAll(row);
      leadsTotal += n;
      if (row?.isHot === true) leadsHot += n;
      if (String(row?.status || '').toLowerCase() === 'incoming') leadsIncoming += n;
    }

    kpis.system = {
      leadsTotal,
      leadsHot,
      leadsIncoming,
    };

    hotLeads.forEach((l) => {
      const leadId = String(l.id ?? '');
      actions.push({
        id: `system-lead-${leadId}`,
        source: 'system',
        title: `${String(l.name || 'ליד חם')}${l.company ? ` · ${String(l.company)}` : ''}`,
        subtitle: 'System · ליד חם',
        href: `/w/${encodeURIComponent(orgSlug)}/system?leadId=${encodeURIComponent(leadId)}`,
        priority: 'high',
      });
    });
  }

  // -----------------------------
  // Social (Posts)
  // -----------------------------
  if (entitlements.social) {
    const orgId = String(workspace.id);
    const [postCounts, scheduledPosts] = await prisma.$transaction([
      prisma.socialPost.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { _all: true },
        orderBy: [{ status: 'asc' }],
      }),
      prisma.socialPost.findMany({
        where: { organizationId: orgId, status: { equals: 'scheduled', mode: 'insensitive' } },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
    ]);

    let postsTotal = 0;
    let postsDraft = 0;
    let postsScheduled = 0;
    let postsPublished = 0;
    for (const row of postCounts) {
      const n = readGroupByCountAll(row);
      postsTotal += n;
      const status = String(row?.status || '').toLowerCase();
      if (status === 'draft') postsDraft += n;
      if (status === 'scheduled') postsScheduled += n;
      if (status === 'published') postsPublished += n;
    }

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

  // -----------------------------
  // Finance (Costs / access-gated)
  // -----------------------------
  if (entitlements.finance) {
    const canViewFinancials = await hasPermission('view_financials');

    if (canViewFinancials) {
      const agg = await prisma.nexusTimeEntry.aggregate({
        where: { organizationId: String(workspace.id) },
        _sum: { durationMinutes: true },
      });

      const totalMinutes = Number(agg._sum?.durationMinutes ?? 0) || 0;

      kpis.finance = {
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      };
    } else {
      kpis.finance = {
        locked: true,
      };
    }
  }

  actions.sort((a, b) => {
    const order: Record<OwnerDashboardAction['priority'], number> = { urgent: 0, high: 1, normal: 2 };
    return order[a.priority] - order[b.priority];
  });

  return NextResponse.json({
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug ?? null },
    entitlements,
    kpis,
    nextActions: actions.slice(0, 10),
  });
}

export const GET = shabbatGuard(workspaceTenantGuard(GETHandler, { source: 'api_workspaces_owner_dashboard', reason: 'GET' }));
