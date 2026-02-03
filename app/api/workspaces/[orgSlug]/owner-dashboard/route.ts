import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

function getErrorStatus(error: unknown, fallback = 403): number {
  const status = asObject(error)?.status;
  return typeof status === 'number' ? status : fallback;
}
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
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  let workspace;
  try {
    workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
  } catch (e: unknown) {
    const status = getErrorStatus(e, 403);
    return NextResponse.json({ error: getErrorMessage(e) || 'Forbidden' }, { status });
  }
  const entitlements = workspace.entitlements;

  const actions: OwnerDashboardAction[] = [];

  const kpis: Record<string, unknown> = {
    entitlements,
    generatedAt: new Date().toISOString(),
  };

  // -----------------------------
  // Nexus (Tasks)
  // -----------------------------
  if (entitlements.nexus) {
    const list = await prisma.nexusTask.findMany({
      where: { organizationId: String(workspace.id) },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });

    const open = list.filter((t) => {
      const s = String(t.status || '').toLowerCase();
      return s !== 'done' && s !== 'completed' && s !== 'canceled' && s !== 'cancelled';
    });

    const urgent = open.filter((t) => String(t.priority || '').toLowerCase() === 'urgent');

    kpis.nexus = {
      tasksOpen: open.length,
      tasksUrgent: urgent.length,
    };

    urgent.slice(0, 4).forEach((t) => {
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
    const leads = await prisma.systemLead.findMany({
      where: { organizationId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });

    const total = leads.length;
    const hot = leads.filter((l) => Boolean(asObject(l as unknown)?.isHot)).length;
    const incoming = leads.filter((l) => String(asObject(l as unknown)?.status || '').toLowerCase() === 'incoming').length;

    kpis.system = {
      leadsTotal: total,
      leadsHot: hot,
      leadsIncoming: incoming,
    };

    leads
      .filter((l) => Boolean(asObject(l as unknown)?.isHot))
      .slice(0, 3)
      .forEach((l) => {
        const lo = asObject(l as unknown) ?? {};
        const leadId = String(lo.id ?? '');
        actions.push({
          id: `system-lead-${leadId}`,
          source: 'system',
          title: `${String(lo.name || 'ליד חם')}${lo.company ? ` · ${String(lo.company)}` : ''}`,
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
    const posts = await prisma.socialPost.findMany({
      where: { organizationId: String(workspace.id) },
      select: { id: true, status: true, scheduled_at: true, published_at: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const list = Array.isArray(posts) ? posts : [];
    const statusCount = (s: string) => list.filter((p) => String(p.status || '').toLowerCase() === s).length;

    kpis.social = {
      postsTotal: list.length,
      postsDraft: statusCount('draft'),
      postsScheduled: statusCount('scheduled'),
      postsPublished: statusCount('published'),
    };

    // If there are scheduled posts, surface as next actions
    list
      .filter((p) => String(p.status || '').toLowerCase() === 'scheduled')
      .slice(0, 2)
      .forEach((p) => {
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
      const entries = await prisma.nexusTimeEntry.findMany({
        where: { organizationId: String(workspace.id) },
        select: { id: true, durationMinutes: true },
        take: 1000,
      });

      const entriesList = Array.isArray(entries) ? entries : [];
      const totalMinutes = entriesList.reduce((sum: number, e) => sum + Number(e.durationMinutes || 0), 0);

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

export const GET = shabbatGuard(GETHandler);
