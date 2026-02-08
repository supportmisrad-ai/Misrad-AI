import 'server-only';

import { orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toNumberSafe } from '@/lib/services/operations/shared';
import { ensureOperationsVehicleHolderId } from '@/lib/services/operations/stock-holders';
import type { OperationsHolderStockRow } from '@/lib/services/operations/types';

export async function getOperationsVehicleStockBalancesForOrganizationId(params: {
  organizationId: string;
  vehicleId: string;
}): Promise<{ success: boolean; data?: OperationsHolderStockRow[]; error?: string }> {
  try {
    const vehicleId = String(params.vehicleId || '').trim();
    if (!vehicleId) return { success: false, error: 'חסר רכב' };

    const vRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `SELECT id::text as id, name FROM operations_vehicles WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
      [params.organizationId, vehicleId]
    );
    const vFirst = asObject((vRows || [])[0]);
    if (!vFirst?.id) return { success: false, error: 'רכב לא נמצא או שאין הרשאה' };

    const vehicleName = vFirst.name ? String(vFirst.name) : 'רכב';
    const holderId = await ensureOperationsVehicleHolderId({ organizationId: params.organizationId, vehicleId, label: vehicleName });

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          i.id::text as item_id,
          i.name as item_name,
          i.sku as item_sku,
          i.unit as item_unit,
          sb.on_hand as on_hand
        FROM operations_stock_balances sb
        JOIN operations_items i
          ON i.id = sb.item_id
         AND i.organization_id = sb.organization_id
        WHERE sb.organization_id = $1::uuid
          AND sb.holder_id = $2::uuid
        ORDER BY lower(i.name) ASC
      `,
      [params.organizationId, holderId]
    );

    const data: OperationsHolderStockRow[] = (rows || []).map((r) => {
      const obj = asObject(r) ?? {};
      const sku = obj.item_sku ? String(obj.item_sku) : '';
      const labelBase = obj.item_name ? String(obj.item_name) : '';
      const label = sku ? `${labelBase} (${sku})` : labelBase;
      return {
        itemId: String(obj.item_id),
        label,
        onHand: toNumberSafe(obj.on_hand),
        unit: obj.item_unit ? String(obj.item_unit) : null,
      };
    });

    return { success: true, data };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsVehicleStockBalances failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מלאי רכב' };
  }
}
