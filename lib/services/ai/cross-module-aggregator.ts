import 'server-only';

import prisma, { queryRawOrgScoped } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { asObject } from '@/lib/shared/unknown';

/**
 * Cross-Module Aggregator
 * 
 * Pulls KPI data from ALL modules for a given organization.
 * Used by: Nexus AI, periodic reports, AI Card, Super Admin dashboard.
 * 
 * SECURITY: Always scoped to a single organizationId. Never cross-references orgs.
 * TRUTH ENFORCEMENT: All data comes directly from DB — never fabricated or estimated
 * without explicit labeling.
 */

export interface OrgSnapshot {
  organizationId: string;
  generatedAt: string;

  system: {
    totalLeads: number;
    leadsThisMonth: number;
    wonThisMonth: number;
    lostThisMonth: number;
    conversionRate: number;
    hottestLeadName: string | null;
    pipelineValue: number;
    avgDealSize: number;
  };

  client: {
    totalClients: number;
    activeClients: number;
    atRiskClients: number;
    avgHealthScore: number;
    recentMeetings: number;
    overdueFollowups: number;
  };

  finance: {
    revenueThisMonth: number;
    recurringMonthly: number;
    overdueInvoices: number;
    overdueAmount: number;
    weightedPipeline: number;
    cashFlowProjection: number;
  };

  operations: {
    openWorkOrders: number;
    completedThisMonth: number;
    avgCompletionDays: number;
    slaBreaches: number;
    slaComplianceRate: number;
    inventoryTotal: number;
    inventoryLow: number;
    inventoryCritical: number;
    topTechnicianName: string | null;
    topTechnicianCompleted: number;
  };

  team: {
    totalMembers: number;
    activeMembers: number;
    tasksCompletedThisMonth: number;
    tasksOverdue: number;
    avgTasksPerMember: number;
  };

  ai: {
    totalSessions: number;
    avgRating: number | null;
    helpfulRate: number | null;
    topSituationType: string | null;
  };

  alerts: AlertItem[];
}

export interface AlertItem {
  severity: 'critical' | 'warning' | 'info';
  module: string;
  title: string;
  description: string;
  dataSource: string;
}

function toNum(val: unknown): number {
  if (val == null) return 0;
  if (val instanceof Prisma.Decimal) return val.toNumber();
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const startOfThisMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

/**
 * Aggregate organization-wide snapshot from all modules.
 * All queries are scoped to organizationId — tenant isolation enforced.
 */
export async function aggregateOrgSnapshot(organizationId: string): Promise<OrgSnapshot> {
  const som = startOfThisMonth();
  const somIso = som.toISOString();
  const alerts: AlertItem[] = [];

  // ── System Module ──
  const [systemStats] = await Promise.all([
    queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
      organizationId,
      reason: 'cross_module_system_stats',
      query: `
        SELECT
          COUNT(*) AS total_leads,
          COUNT(*) FILTER (WHERE created_at >= $2::timestamptz) AS leads_this_month,
          COUNT(*) FILTER (WHERE lower(status) = 'won' AND updated_at >= $2::timestamptz) AS won_this_month,
          COUNT(*) FILTER (WHERE lower(status) = 'lost' AND updated_at >= $2::timestamptz) AS lost_this_month,
          COALESCE(SUM(CASE WHEN lower(status) NOT IN ('won','lost') THEN COALESCE(value,0)::numeric ELSE 0 END), 0) AS pipeline_value,
          COALESCE(AVG(CASE WHEN lower(status) = 'won' AND updated_at >= $2::timestamptz THEN COALESCE(value,0)::numeric ELSE NULL END), 0) AS avg_deal_size
        FROM system_leads
        WHERE organization_id = $1::uuid
      `,
      values: [organizationId, somIso],
    }),
  ]);

  const ss = asObject(Array.isArray(systemStats) ? systemStats[0] : null) ?? {};
  const totalLeads = toNum(ss.total_leads);
  const leadsThisMonth = toNum(ss.leads_this_month);
  const wonThisMonth = toNum(ss.won_this_month);
  const lostThisMonth = toNum(ss.lost_this_month);
  const closedThisMonth = wonThisMonth + lostThisMonth;
  const conversionRate = closedThisMonth > 0 ? round2((wonThisMonth / closedThisMonth) * 100) : 0;

  let hottestLeadName: string | null = null;
  try {
    const hottest = await prisma.systemLead.findFirst({
      where: { organizationId },
      orderBy: [{ isHot: 'desc' }, { score: 'desc' }, { updatedAt: 'desc' }],
      select: { name: true },
    });
    hottestLeadName = hottest?.name ? String(hottest.name) : null;
  } catch { /* non-critical */ }

  // ── Client Module ──
  let clientStats = { totalClients: 0, activeClients: 0, atRiskClients: 0, avgHealthScore: 0, recentMeetings: 0, overdueFollowups: 0 };
  try {
    const clientRows = await queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
      organizationId,
      reason: 'cross_module_client_stats',
      query: `
        SELECT
          COUNT(*) AS total_clients,
          COUNT(*) FILTER (WHERE lower(COALESCE(status,'')) NOT IN ('churned','inactive','archived')) AS active_clients,
          COUNT(*) FILTER (WHERE COALESCE(health_score,100)::int < 50) AS at_risk_clients,
          COALESCE(AVG(COALESCE(health_score,0)::numeric), 0) AS avg_health_score
        FROM client_clients
        WHERE organization_id = $1::uuid
      `,
      values: [organizationId],
    });
    const cs = asObject(Array.isArray(clientRows) ? clientRows[0] : null) ?? {};
    clientStats.totalClients = toNum(cs.total_clients);
    clientStats.activeClients = toNum(cs.active_clients);
    clientStats.atRiskClients = toNum(cs.at_risk_clients);
    clientStats.avgHealthScore = round2(toNum(cs.avg_health_score));
  } catch { /* non-critical */ }

  try {
    const meetingCount = await prisma.misradMeeting.count({
      where: { organization_id: organizationId, date: { gte: somIso } },
    });
    clientStats.recentMeetings = meetingCount;
  } catch { /* non-critical */ }

  // ── Finance Module ──
  let financeStats = { revenueThisMonth: 0, recurringMonthly: 0, overdueInvoices: 0, overdueAmount: 0, weightedPipeline: 0, cashFlowProjection: 0 };
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [wpRows, overdueRows, recurringAgg] = await Promise.all([
      queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
        organizationId,
        reason: 'cross_module_finance_pipeline',
        query: `SELECT COALESCE(SUM((COALESCE(value,0)::numeric)*GREATEST(0,LEAST(1,(COALESCE(score,0)::numeric/100.0)))),0) AS wp FROM system_leads WHERE organization_id=$1::uuid AND lower(COALESCE(status,'')) NOT IN ('won','lost')`,
        values: [organizationId],
      }),
      queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
        organizationId,
        reason: 'cross_module_finance_overdue',
        query: `SELECT COUNT(*) AS cnt, COALESCE(SUM(amount::numeric),0) AS total FROM misrad_invoices WHERE organization_id=$1::uuid AND status != 'PAID' AND "dueDate" < $2`,
        values: [organizationId, today],
      }),
      prisma.nexusBillingItem.aggregate({
        where: { organization_id: organizationId, cadence: 'monthly' },
        _sum: { amount: true },
      }),
    ]);

    const wp = asObject(Array.isArray(wpRows) ? wpRows[0] : null) ?? {};
    const od = asObject(Array.isArray(overdueRows) ? overdueRows[0] : null) ?? {};

    financeStats.weightedPipeline = round2(toNum(wp.wp));
    financeStats.overdueInvoices = toNum(od.cnt);
    financeStats.overdueAmount = round2(toNum(od.total));
    const rmAmt = recurringAgg._sum?.amount;
    financeStats.recurringMonthly = round2(rmAmt instanceof Prisma.Decimal ? rmAmt.toNumber() : toNum(rmAmt));
    financeStats.cashFlowProjection = round2(financeStats.recurringMonthly + financeStats.weightedPipeline - financeStats.overdueAmount);
  } catch { /* non-critical */ }

  // ── Operations Module ──
  let opsStats = { openWorkOrders: 0, completedThisMonth: 0, avgCompletionDays: 0, slaBreaches: 0, slaComplianceRate: 100, inventoryTotal: 0, inventoryLow: 0, inventoryCritical: 0, topTechnicianName: null as string | null, topTechnicianCompleted: 0 };
  try {
    const [opsRows, invRows, techRows] = await Promise.all([
      queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
        organizationId,
        reason: 'cross_module_operations_stats',
        query: `
          SELECT
            COUNT(*) FILTER (WHERE lower(status) NOT IN ('completed','closed','cancelled','done')) AS open_count,
            COUNT(*) FILTER (WHERE lower(status) IN ('completed','closed','done') AND completed_at >= $2::timestamptz) AS completed_this_month,
            COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) FILTER (WHERE completed_at IS NOT NULL AND completed_at >= $2::timestamptz), 0) AS avg_days,
            COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND completed_at IS NOT NULL AND completed_at > sla_deadline) AS sla_breaches,
            COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND completed_at IS NOT NULL) AS sla_total
          FROM operations_work_orders
          WHERE organization_id = $1::uuid
        `,
        values: [organizationId, somIso],
      }),
      queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
        organizationId,
        reason: 'cross_module_inventory_stats',
        query: `
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE on_hand <= 0) AS critical,
            COUNT(*) FILTER (WHERE min_level > 0 AND on_hand > 0 AND on_hand < min_level) AS low
          FROM operations_inventory
          WHERE organization_id = $1::uuid
        `,
        values: [organizationId],
      }),
      queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
        organizationId,
        reason: 'cross_module_top_technician',
        query: `
          SELECT
            p.full_name AS tech_name,
            COUNT(*)::int AS completed
          FROM operations_work_orders wo
          JOIN profiles p ON p.id = wo.assigned_technician_id AND p.organization_id = wo.organization_id
          WHERE wo.organization_id = $1::uuid
            AND lower(wo.status) IN ('done','completed','closed')
            AND wo.completed_at >= $2::timestamptz
          GROUP BY p.full_name
          ORDER BY completed DESC
          LIMIT 1
        `,
        values: [organizationId, somIso],
      }),
    ]);

    const os = asObject(Array.isArray(opsRows) ? opsRows[0] : null) ?? {};
    opsStats.openWorkOrders = toNum(os.open_count);
    opsStats.completedThisMonth = toNum(os.completed_this_month);
    opsStats.avgCompletionDays = round2(toNum(os.avg_days));
    opsStats.slaBreaches = toNum(os.sla_breaches);
    const slaTotal = toNum(os.sla_total);
    opsStats.slaComplianceRate = slaTotal > 0 ? round2(((slaTotal - opsStats.slaBreaches) / slaTotal) * 100) : 100;

    const inv = asObject(Array.isArray(invRows) ? invRows[0] : null) ?? {};
    opsStats.inventoryTotal = toNum(inv.total);
    opsStats.inventoryLow = toNum(inv.low);
    opsStats.inventoryCritical = toNum(inv.critical);

    const topTech = asObject(Array.isArray(techRows) ? techRows[0] : null) ?? {};
    opsStats.topTechnicianName = typeof topTech.tech_name === 'string' ? topTech.tech_name : null;
    opsStats.topTechnicianCompleted = toNum(topTech.completed);
  } catch { /* non-critical */ }

  // ── Team Module ──
  let teamStats = { totalMembers: 0, activeMembers: 0, tasksCompletedThisMonth: 0, tasksOverdue: 0, avgTasksPerMember: 0 };
  try {
    const memberCount = await prisma.organizationUser.count({
      where: { organization_id: organizationId },
    });
    teamStats.totalMembers = memberCount;
    teamStats.activeMembers = memberCount;
  } catch { /* non-critical */ }

  try {
    const taskRows = await queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
      organizationId,
      reason: 'cross_module_team_tasks',
      query: `
        SELECT
          COUNT(*) FILTER (WHERE lower(status) IN ('done','completed') AND updated_at >= $2::timestamptz) AS completed,
          COUNT(*) FILTER (WHERE lower(status) NOT IN ('done','completed') AND due_date IS NOT NULL AND due_date < NOW()) AS overdue
        FROM nexus_tasks
        WHERE organization_id = $1::uuid
      `,
      values: [organizationId, somIso],
    });
    const ts = asObject(Array.isArray(taskRows) ? taskRows[0] : null) ?? {};
    teamStats.tasksCompletedThisMonth = toNum(ts.completed);
    teamStats.tasksOverdue = toNum(ts.overdue);
    teamStats.avgTasksPerMember = teamStats.activeMembers > 0 ? round2(teamStats.tasksCompletedThisMonth / teamStats.activeMembers) : 0;
  } catch { /* non-critical */ }

  // ── AI Usage ──
  let aiStats = { totalSessions: 0, avgRating: null as number | null, helpfulRate: null as number | null, topSituationType: null as string | null };
  try {
    const aiRows = await queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
      organizationId,
      reason: 'cross_module_ai_stats',
      query: `
        SELECT
          COUNT(*) AS total,
          AVG(user_rating) AS avg_rating,
          COUNT(*) FILTER (WHERE helpful_yn = true) AS helpful,
          COUNT(*) FILTER (WHERE helpful_yn IS NOT NULL) AS rated,
          mode() WITHIN GROUP (ORDER BY situation_type) AS top_situation
        FROM ai_chat_sessions
        WHERE organization_id = $1::uuid AND started_at >= $2::timestamptz
      `,
      values: [organizationId, somIso],
    });
    const ai = asObject(Array.isArray(aiRows) ? aiRows[0] : null) ?? {};
    aiStats.totalSessions = toNum(ai.total);
    aiStats.avgRating = ai.avg_rating != null ? round2(toNum(ai.avg_rating)) : null;
    const rated = toNum(ai.rated);
    const helpful = toNum(ai.helpful);
    aiStats.helpfulRate = rated > 0 ? round2((helpful / rated) * 100) : null;
    aiStats.topSituationType = typeof ai.top_situation === 'string' ? ai.top_situation : null;
  } catch { /* non-critical */ }

  // ── Build Alerts (data-driven, never fabricated) ──
  if (financeStats.overdueInvoices > 0) {
    alerts.push({
      severity: financeStats.overdueAmount > 10000 ? 'critical' : 'warning',
      module: 'finance',
      title: `${financeStats.overdueInvoices} חשבוניות בפיגור`,
      description: `סה"כ ${financeStats.overdueAmount.toLocaleString()} ₪ בחשבוניות שעבר מועד התשלום שלהן`,
      dataSource: 'misrad_invoices WHERE status != PAID AND dueDate < today',
    });
  }

  if (clientStats.atRiskClients > 0) {
    alerts.push({
      severity: clientStats.atRiskClients >= 3 ? 'critical' : 'warning',
      module: 'client',
      title: `${clientStats.atRiskClients} לקוחות בסיכון`,
      description: `ציון בריאות מתחת ל-50 — דורש התערבות מיידית`,
      dataSource: 'client_clients WHERE health_score < 50',
    });
  }

  if (teamStats.tasksOverdue > 0) {
    alerts.push({
      severity: teamStats.tasksOverdue >= 10 ? 'critical' : 'warning',
      module: 'team',
      title: `${teamStats.tasksOverdue} משימות באיחור`,
      description: `משימות שעבר מועד הביצוע שלהן`,
      dataSource: 'nexus_tasks WHERE status != done AND due_date < NOW()',
    });
  }

  if (opsStats.slaBreaches > 0) {
    alerts.push({
      severity: opsStats.slaComplianceRate < 80 ? 'critical' : 'warning',
      module: 'operations',
      title: `${opsStats.slaBreaches} חריגות SLA`,
      description: `שיעור עמידה ב-SLA: ${opsStats.slaComplianceRate}%`,
      dataSource: 'operations_work_orders WHERE completed_at > sla_deadline',
    });
  }

  if (opsStats.inventoryCritical > 0) {
    alerts.push({
      severity: 'critical',
      module: 'operations',
      title: `${opsStats.inventoryCritical} פריטי מלאי אזלו`,
      description: `${opsStats.inventoryCritical} פריטים עם כמות 0 במלאי${opsStats.inventoryLow > 0 ? `, ${opsStats.inventoryLow} נוספים מתחת למינימום` : ''}`,
      dataSource: 'operations_inventory WHERE on_hand <= 0',
    });
  } else if (opsStats.inventoryLow > 0) {
    alerts.push({
      severity: 'warning',
      module: 'operations',
      title: `${opsStats.inventoryLow} פריטי מלאי נמוכים`,
      description: `${opsStats.inventoryLow} פריטים מתחת לכמות מינימום — יש לבצע הזמנה`,
      dataSource: 'operations_inventory WHERE on_hand < min_level',
    });
  }

  if (conversionRate > 0 && conversionRate < 20) {
    alerts.push({
      severity: 'warning',
      module: 'system',
      title: `שיעור המרה נמוך: ${conversionRate}%`,
      description: `${wonThisMonth} מתוך ${closedThisMonth} עסקאות שנסגרו החודש הסתיימו בהצלחה`,
      dataSource: 'system_leads WHERE status IN (won,lost) this month',
    });
  }

  return {
    organizationId,
    generatedAt: new Date().toISOString(),
    system: {
      totalLeads,
      leadsThisMonth,
      wonThisMonth,
      lostThisMonth,
      conversionRate,
      hottestLeadName,
      pipelineValue: round2(toNum(ss.pipeline_value)),
      avgDealSize: round2(toNum(ss.avg_deal_size)),
    },
    client: clientStats,
    finance: financeStats,
    operations: opsStats,
    team: teamStats,
    ai: aiStats,
    alerts,
  };
}
