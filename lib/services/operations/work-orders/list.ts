import 'server-only';

import { orgQuery, prisma } from '@/lib/services/operations/db';
import {
  ALLOW_SCHEMA_FALLBACKS,
  asObject,
  getUnknownErrorMessage,
  isSchemaMismatchError,
  logOperationsError,
} from '@/lib/services/operations/shared';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';
import type { OperationsWorkOrdersData, OperationsWorkOrderStatus } from '@/lib/services/operations/types';

export async function getOperationsWorkOrdersDataForOrganizationId(params: {
  organizationId: string;
  status?: 'OPEN' | 'ALL' | OperationsWorkOrderStatus;
  projectId?: string;
  assignedTechnicianId?: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrdersData; error?: string }> {
  try {
    const status = params.status || 'OPEN';
    const projectId = params.projectId ? String(params.projectId).trim() : '';
    const assignedTechnicianId = params.assignedTechnicianId ? String(params.assignedTechnicianId).trim() : '';

    const values: unknown[] = [params.organizationId];
    let idx = values.length;

    let whereSql = `wo.organization_id = $1::uuid`;

    if (projectId) {
      idx += 1;
      values.push(projectId);
      whereSql += ` AND wo.project_id = $${idx}::uuid`;
    }

    if (status === 'OPEN') {
      whereSql += ` AND wo.status <> 'DONE'`;
    } else if (status !== 'ALL') {
      idx += 1;
      values.push(status);
      whereSql += ` AND wo.status = $${idx}::text`;
    }

    if (assignedTechnicianId) {
      idx += 1;
      values.push(assignedTechnicianId);
      whereSql += ` AND wo.assigned_technician_id = $${idx}::uuid`;
    }

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          wo.id::text as id,
          wo.title as title,
          wo.status as status,
          COALESCE(wo.priority, 'NORMAL') as priority,
          wo.project_id::text as project_id,
          p.title as project_title,
          wo.assigned_technician_id::text as assigned_technician_id,
          wo.installation_lat as installation_lat,
          wo.installation_lng as installation_lng,
          wo.category_id::text as category_id,
          cat.name as category_name,
          wo.department_id::text as department_id,
          wo.building_id::text as building_id,
          bld.name as building_name,
          wo.floor as floor,
          wo.unit as unit,
          wo.reporter_name as reporter_name,
          wo.reporter_phone as reporter_phone,
          wo.sla_deadline as sla_deadline,
          wo.completed_at as completed_at,
          wo.created_at as created_at
        FROM operations_work_orders wo
        LEFT JOIN operations_projects p
          ON p.id = wo.project_id
        LEFT JOIN operations_call_categories cat
          ON cat.id = wo.category_id
        LEFT JOIN operations_buildings bld
          ON bld.id = wo.building_id
        WHERE ${whereSql}
        ORDER BY wo.created_at DESC
      `,
      values
    );

    const technicianIds = Array.from(
      new Set(
        (rows || [])
          .map((r) => {
            const obj = asObject(r);
            return obj?.assigned_technician_id ? String(obj.assigned_technician_id) : null;
          })
          .filter(Boolean)
      )
    ) as string[];

    const technicians = technicianIds.length
      ? await prisma.profile.findMany({
          where: { organizationId: params.organizationId, id: { in: technicianIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];

    const techById = new Map<string, string>();
    for (const t of technicians) {
      techById.set(String(t.id), String(t.fullName || t.email || t.id));
    }

    const toIso = (v: unknown): string | null => {
      if (!v) return null;
      const d = v instanceof Date ? v : new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    };

    const data: OperationsWorkOrdersData = {
      workOrders: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        const assignedId = obj.assigned_technician_id ? String(obj.assigned_technician_id) : '';
        const latRaw = obj.installation_lat;
        const lngRaw = obj.installation_lng;
        return {
          id: String(obj.id ?? ''),
          title: String(obj.title ?? ''),
          projectId: obj.project_id ? String(obj.project_id) : null,
          projectTitle: obj.project_title ? String(obj.project_title) : null,
          status: String(obj.status ?? 'NEW') as OperationsWorkOrderStatus,
          priority: (String(obj.priority ?? 'NORMAL') as 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL'),
          technicianLabel: assignedId ? techById.get(assignedId) ?? null : null,
          installationLat: latRaw === null || latRaw === undefined ? null : Number(latRaw),
          installationLng: lngRaw === null || lngRaw === undefined ? null : Number(lngRaw),
          categoryId: obj.category_id ? String(obj.category_id) : null,
          categoryName: obj.category_name ? String(obj.category_name) : null,
          departmentId: obj.department_id ? String(obj.department_id) : null,
          buildingId: obj.building_id ? String(obj.building_id) : null,
          buildingName: obj.building_name ? String(obj.building_name) : null,
          floor: obj.floor ? String(obj.floor) : null,
          unit: obj.unit ? String(obj.unit) : null,
          reporterName: obj.reporter_name ? String(obj.reporter_name) : null,
          reporterPhone: obj.reporter_phone ? String(obj.reporter_phone) : null,
          slaDeadline: toIso(obj.sla_deadline),
          completedAt: toIso(obj.completed_at),
          createdAt: toIso(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };

    return { success: true, data };
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] operations_work_orders missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'lib/services/operations/work-orders/list.getOperationsWorkOrdersDataForOrganizationId',
        reason: 'operations_work_orders schema mismatch (fallback to error response)',
        error: e,
        extras: { organizationId: String(params.organizationId), status: params.status ?? null },
      });
    }
    logOperationsError('[operations] getOperationsWorkOrdersData failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאות' };
  }
}
