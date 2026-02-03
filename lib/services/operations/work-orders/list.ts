import 'server-only';

import { orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage } from '@/lib/services/operations/shared';
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
          wo.project_id::text as project_id,
          p.title as project_title,
          wo.assigned_technician_id::text as assigned_technician_id,
          wo.installation_lat as installation_lat,
          wo.installation_lng as installation_lng,
          wo.created_at as created_at
        FROM operations_work_orders wo
        JOIN operations_projects p
          ON p.id = wo.project_id
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

    const data: OperationsWorkOrdersData = {
      workOrders: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        const assignedId = obj.assigned_technician_id ? String(obj.assigned_technician_id) : '';
        const latRaw = obj.installation_lat;
        const lngRaw = obj.installation_lng;
        return {
          id: String(obj.id ?? ''),
          title: String(obj.title ?? ''),
          projectId: String(obj.project_id ?? ''),
          projectTitle: String(obj.project_title ?? ''),
          status: String(obj.status ?? 'NEW') as OperationsWorkOrderStatus,
          technicianLabel: assignedId ? techById.get(assignedId) ?? null : null,
          installationLat: latRaw === null || latRaw === undefined ? null : Number(latRaw),
          installationLng: lngRaw === null || lngRaw === undefined ? null : Number(lngRaw),
        };
      }),
    };

    return { success: true, data };
  } catch (e: unknown) {
    console.error('[operations] getOperationsWorkOrdersData failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאות' };
  }
}
