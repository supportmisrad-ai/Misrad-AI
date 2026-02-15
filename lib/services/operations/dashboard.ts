import 'server-only';

import { orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate, toNumberSafe } from '@/lib/services/operations/shared';
import { resolveOperationsClientNamesByCanonicalId } from '@/lib/services/operations/projects';
import type { OperationsDashboardData } from '@/lib/services/operations/types';

type OperationsDashboardProjectRow = {
  id: string;
  title: string;
  status: string;
  canonicalClientId: string | null;
  updatedAt: Date;
};

export async function getOperationsDashboardDataForOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsDashboardData; error?: string }> {
  try {
    const [recentProjects, inventoryRows, woStatsRows, recentWoRows] = await Promise.all([
      prisma.operationsProject.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, canonicalClientId: true, updatedAt: true },
      }) as Promise<OperationsDashboardProjectRow[]>,

      prisma.operationsInventory.findMany({
        where: { organizationId: params.organizationId },
        select: { onHand: true, minLevel: true },
      }),

      orgQuery<unknown[]>(
        prisma,
        params.organizationId,
        `
          SELECT
            COUNT(*) FILTER (WHERE status IN ('NEW','OPEN')) AS open_count,
            COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
            COUNT(*) FILTER (WHERE status = 'DONE' AND completed_at >= CURRENT_DATE) AS done_today_count,
            COUNT(*) AS total_count,
            COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND sla_deadline < NOW() AND status NOT IN ('DONE')) AS sla_breach_count,
            COUNT(*) FILTER (WHERE assigned_technician_id IS NULL AND status NOT IN ('DONE')) AS unassigned_count,
            COUNT(*) FILTER (WHERE COALESCE(priority,'NORMAL') = 'HIGH' AND status NOT IN ('DONE')) AS priority_high,
            COUNT(*) FILTER (WHERE COALESCE(priority,'NORMAL') = 'URGENT' AND status NOT IN ('DONE')) AS priority_urgent,
            COUNT(*) FILTER (WHERE COALESCE(priority,'NORMAL') = 'CRITICAL' AND status NOT IN ('DONE')) AS priority_critical
          FROM operations_work_orders
          WHERE organization_id = $1::uuid
        `,
        [params.organizationId]
      ),

      orgQuery<unknown[]>(
        prisma,
        params.organizationId,
        `
          SELECT
            wo.id::text, wo.title, wo.status,
            COALESCE(wo.priority,'NORMAL') AS priority,
            cat.name AS category_name,
            wo.sla_deadline,
            wo.assigned_technician_id::text,
            wo.created_at
          FROM operations_work_orders wo
          LEFT JOIN operations_call_categories cat ON cat.id = wo.category_id
          WHERE wo.organization_id = $1::uuid
          ORDER BY wo.created_at DESC
          LIMIT 8
        `,
        [params.organizationId]
      ),
    ]);

    const canonicalClientIds = Array.from(
      new Set(recentProjects.map((p) => p.canonicalClientId).filter(Boolean))
    ) as string[];

    const clientNameById = await resolveOperationsClientNamesByCanonicalId(canonicalClientIds);

    let ok = 0;
    let low = 0;
    let critical = 0;

    for (const row of inventoryRows) {
      const onHand = toNumberSafe(row.onHand);
      const minLevel = toNumberSafe(row.minLevel);

      if (onHand <= 0) { critical += 1; continue; }
      if (minLevel > 0 && onHand < minLevel) { low += 1; continue; }
      ok += 1;
    }

    // Work order stats
    const statsRow = asObject((woStatsRows || [])[0]) ?? {};
    const woStats = {
      open: Number(statsRow.open_count ?? 0),
      inProgress: Number(statsRow.in_progress_count ?? 0),
      doneToday: Number(statsRow.done_today_count ?? 0),
      total: Number(statsRow.total_count ?? 0),
      slaBreach: Number(statsRow.sla_breach_count ?? 0),
      unassigned: Number(statsRow.unassigned_count ?? 0),
      priorityHigh: Number(statsRow.priority_high ?? 0),
      priorityUrgent: Number(statsRow.priority_urgent ?? 0),
      priorityCritical: Number(statsRow.priority_critical ?? 0),
    };

    // Resolve technician names for recent work orders
    const techIds = (recentWoRows || [])
      .map((r) => asObject(r)?.assigned_technician_id)
      .filter(Boolean)
      .map(String);
    const uniqueTechIds = [...new Set(techIds)];
    const techLabelMap = new Map<string, string>();
    if (uniqueTechIds.length) {
      const techs = await prisma.profile.findMany({
        where: { id: { in: uniqueTechIds }, organizationId: params.organizationId },
        select: { id: true, fullName: true, email: true },
      });
      for (const t of techs) techLabelMap.set(t.id, String(t.fullName || t.email || t.id));
    }

    const recentWorkOrders = (recentWoRows || []).map((r) => {
      const obj = asObject(r) ?? {};
      const techId = obj.assigned_technician_id ? String(obj.assigned_technician_id) : null;
      return {
        id: String(obj.id ?? ''),
        title: String(obj.title ?? ''),
        status: String(obj.status ?? ''),
        priority: String(obj.priority ?? 'NORMAL'),
        categoryName: obj.category_name ? String(obj.category_name) : null,
        technicianLabel: techId ? techLabelMap.get(techId) ?? null : null,
        slaDeadline: obj.sla_deadline ? toIsoDate(obj.sla_deadline) : null,
        createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
      };
    });

    const data: OperationsDashboardData = {
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        clientName: p.canonicalClientId ? clientNameById.get(p.canonicalClientId) ?? null : null,
        updatedAt: p.updatedAt.toISOString(),
      })),
      inventorySummary: { ok, low, critical, total: inventoryRows.length },
      workOrderStats: woStats,
      recentWorkOrders,
    };

    return { success: true, data };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsDashboardData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת נתוני הדשבורד',
    };
  }
}
