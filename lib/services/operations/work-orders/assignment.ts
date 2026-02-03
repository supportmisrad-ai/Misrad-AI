import 'server-only';

import { orgExec, prisma } from '@/lib/services/operations/db';
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import {
  ensureOperationsPrimaryWarehouseHolderId,
  resolveDefaultOperationsStockSourceHolderIdForTechnician,
} from '@/lib/services/operations/stock-holders';

export async function setOperationsWorkOrderAssignedTechnicianForOrganizationId(params: {
  organizationId: string;
  id: string;
  technicianId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    const technicianIdRaw = params.technicianId === null ? null : String(params.technicianId || '').trim();
    const technicianId = technicianIdRaw ? technicianIdRaw : null;

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };

    if (technicianId) {
      const tech = await prisma.profile.findFirst({
        where: { id: technicianId, organizationId: params.organizationId },
        select: { id: true },
      });
      if (!tech?.id) {
        return { success: false, error: 'טכנאי לא תקין או שאין הרשאה' };
      }

      await orgExec(
        prisma,
        params.organizationId,
        `UPDATE operations_work_orders SET assigned_technician_id = $1::uuid WHERE id = $2::uuid AND organization_id = $3::uuid`,
        [technicianId, id, params.organizationId]
      );
    } else {
      await orgExec(
        prisma,
        params.organizationId,
        `UPDATE operations_work_orders SET assigned_technician_id = NULL WHERE id = $1::uuid AND organization_id = $2::uuid`,
        [id, params.organizationId]
      );
    }

    try {
      const holderId = technicianId
        ? await resolveDefaultOperationsStockSourceHolderIdForTechnician({
            organizationId: params.organizationId,
            technicianId,
          })
        : await ensureOperationsPrimaryWarehouseHolderId({ organizationId: params.organizationId });

      await orgExec(
        prisma,
        params.organizationId,
        `
          UPDATE operations_work_orders
          SET stock_source_holder_id = $1::uuid
          WHERE id = $2::uuid
            AND organization_id = $3::uuid
            AND stock_source_holder_id IS NULL
        `,
        [holderId, id, params.organizationId]
      );
    } catch {
      // ignore
    }

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] setOperationsWorkOrderAssignedTechnician failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשיוך טכנאי לקריאה' };
  }
}
