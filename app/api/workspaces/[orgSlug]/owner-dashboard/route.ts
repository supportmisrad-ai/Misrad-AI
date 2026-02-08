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

async function GETHandler(
  _req: Request,
  ctx: {
    params: { orgSlug: string };
    workspace?: { id: string; name?: string; slug?: string | null; entitlements?: WorkspaceEntitlements };
  }
) {
  const { orgSlug } = ctx.params;

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

  // -----------------------------
  // System (Leads)
  // -----------------------------
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
    const [postsTotal, postsDraft, postsScheduled, postsPublished, scheduledPosts] = await Promise.all([
      prisma.socialPost.count({ where: { organizationId: orgId } }),
      prisma.socialPost.count({ where: { organizationId: orgId, status: { equals: 'draft', mode: 'insensitive' } } }),
      prisma.socialPost.count({ where: { organizationId: orgId, status: { equals: 'scheduled', mode: 'insensitive' } } }),
      prisma.socialPost.count({ where: { organizationId: orgId, status: { equals: 'published', mode: 'insensitive' } } }),
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
