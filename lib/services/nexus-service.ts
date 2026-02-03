import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/auth';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

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

export async function getNexusOwnerDashboardData(orgSlug: string): Promise<NexusOwnerDashboardData> {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const entitlements = workspace.entitlements;

  const actions: DashboardAction[] = [];

  const kpis: NexusKpis = {
    entitlements,
    generatedAt: new Date().toISOString(),
  };

  if (entitlements.nexus) {
    const list = await prisma.nexusTask.findMany({
      where: { organizationId: workspace.id },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      select: { id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true },
    });

    const open = list.filter((t) => {
      const s = String(t.status ?? '').toLowerCase();
      return s !== 'done' && s !== 'completed' && s !== 'canceled' && s !== 'cancelled';
    });

    const urgent = open.filter((t) => String(t.priority ?? '').toLowerCase() === 'urgent');

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

  if (entitlements.system) {
    const leads = await prisma.systemLead.findMany({
      where: { organizationId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });

    const total = leads.length;
    const hot = leads.filter((l) => Boolean(l.isHot)).length;
    const incoming = leads.filter((l) => String(l.status ?? '').toLowerCase() === 'incoming').length;

    kpis.system = {
      leadsTotal: total,
      leadsHot: hot,
      leadsIncoming: incoming,
    };

    leads
      .filter((l) => Boolean(l.isHot))
      .slice(0, 3)
      .forEach((l) => {
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
    const list = await prisma.socialPost.findMany({
      where: { organizationId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, status: true, scheduled_at: true, published_at: true },
    });
    const statusCount = (s: string) => list.filter((p) => String(p.status ?? '').toLowerCase() === s).length;

    kpis.social = {
      postsTotal: list.length,
      postsDraft: statusCount('draft'),
      postsScheduled: statusCount('scheduled'),
      postsPublished: statusCount('published'),
    };

    list
      .filter((p) => String(p.status ?? '').toLowerCase() === 'scheduled')
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

  if (entitlements.client) {
    const count = await prisma.clientClient.count({ where: { organizationId: workspace.id } });

    kpis.client = {
      clientsTotal: typeof count === 'number' ? count : 0,
    };
  }

  if (entitlements.finance) {
    const canViewFinancials = await hasPermission('view_financials');

    if (canViewFinancials) {
      const entriesList = await prisma.nexusTimeEntry.findMany({
        where: { organizationId: workspace.id },
        select: { durationMinutes: true },
        take: 1000,
      });
      const total = (entriesList || []).reduce((sum, e) => sum + Number(e.durationMinutes ?? 0), 0);

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
