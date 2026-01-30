import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
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
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 403;
    return NextResponse.json({ error: e?.message || 'Forbidden' }, { status });
  }
  const entitlements = workspace.entitlements;

  const supabase = createClient();

  const actions: OwnerDashboardAction[] = [];

  const kpis: any = {
    entitlements,
    generatedAt: new Date().toISOString(),
  };

  // -----------------------------
  // Nexus (Tasks)
  // -----------------------------
  if (entitlements.nexus) {
    const { data: tasks } = await supabase
      .from('nexus_tasks')
      .select('id,title,status,priority,due_date,created_at')
      .eq('organization_id', workspace.id)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(200);

    const list = Array.isArray(tasks) ? tasks : [];

    const open = list.filter((t: any) => {
      const s = String(t.status || '').toLowerCase();
      return s !== 'done' && s !== 'completed' && s !== 'canceled' && s !== 'cancelled';
    });

    const urgent = open.filter((t: any) => String(t.priority || '').toLowerCase() === 'urgent');

    kpis.nexus = {
      tasksOpen: open.length,
      tasksUrgent: urgent.length,
    };

    urgent.slice(0, 4).forEach((t: any) => {
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
    const hot = leads.filter((l) => Boolean((l as any).isHot)).length;
    const incoming = leads.filter((l) => String((l as any).status || '').toLowerCase() === 'incoming').length;

    kpis.system = {
      leadsTotal: total,
      leadsHot: hot,
      leadsIncoming: incoming,
    };

    leads
      .filter((l) => Boolean((l as any).isHot))
      .slice(0, 3)
      .forEach((l) => {
        const leadId = String((l as any).id);
        actions.push({
          id: `system-lead-${leadId}`,
          source: 'system',
          title: `${(l as any).name || 'ליד חם'}${(l as any).company ? ` · ${(l as any).company}` : ''}`,
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
    const { data: posts } = await supabase
      .from('social_posts')
      .select('id,status,scheduled_at,published_at,organization_id')
      .eq('organization_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(500);

    const list = Array.isArray(posts) ? posts : [];
    const statusCount = (s: string) => list.filter((p: any) => String(p.status || '').toLowerCase() === s).length;

    kpis.social = {
      postsTotal: list.length,
      postsDraft: statusCount('draft'),
      postsScheduled: statusCount('scheduled'),
      postsPublished: statusCount('published'),
    };

    // If there are scheduled posts, surface as next actions
    list
      .filter((p: any) => String(p.status || '').toLowerCase() === 'scheduled')
      .slice(0, 2)
      .forEach((p: any) => {
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
      const { data: entries } = await supabase
        .from('nexus_time_entries')
        .select('id,duration_minutes')
        .eq('organization_id', workspace.id)
        .limit(1000);

      const entriesList = Array.isArray(entries) ? entries : [];
      const totalMinutes = entriesList.reduce((sum: number, e: any) => sum + Number(e.duration_minutes || 0), 0);

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
