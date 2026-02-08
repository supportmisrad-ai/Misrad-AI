import 'server-only';

import type { Prisma } from '@prisma/client';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import {
  asObject,
  firstRowField,
  getUnknownErrorMessage,
  logOperationsError,
  toIsoDate,
  toNumberSafe,
} from '@/lib/services/operations/shared';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import {
  ensureOperationsPrimaryWarehouseHolderIdTx,
  ensureOperationsVehicleHolderId,
  resolveDefaultOperationsStockSourceHolderIdForTechnicianTx,
} from '@/lib/services/operations/stock-holders';
import type { OperationsInventoryOption } from '@/lib/services/operations/types';

export async function setOperationsWorkOrderStockSourceForOrganizationId(params: {
  organizationId: string;
  workOrderId: string;
  holderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    const holderId = String(params.holderId || '').trim();

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!holderId) return { success: false, error: 'חובה לבחור מקור מלאי' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    const hRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `SELECT id::text as id FROM operations_stock_holders WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
      [params.organizationId, holderId]
    );
    const holderRow = asObject((hRows || [])[0]);
    if (!holderRow?.id) return { success: false, error: 'מקור מלאי לא תקין' };

    await orgExec(
      prisma,
      params.organizationId,
      `UPDATE operations_work_orders SET stock_source_holder_id = $1::uuid WHERE id = $2::uuid AND organization_id = $3::uuid`,
      [holderId, workOrderId, params.organizationId]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] setOperationsWorkOrderStockSource failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת מקור מלאי' };
  }
}

export async function setOperationsWorkOrderStockSourceToMyActiveVehicleForOrganizationId(params: {
  organizationId: string;
  orgSlug?: string;
  workOrderId: string;
  technicianId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    const technicianId = String(params.technicianId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!technicianId) return { success: false, error: 'לא נמצא טכנאי מחובר' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT a.vehicle_id::text as vehicle_id, v.name as vehicle_name
        FROM operations_technician_vehicle_assignments a
        JOIN operations_vehicles v
          ON v.id = a.vehicle_id
         AND v.organization_id = a.organization_id
        WHERE a.organization_id = $1::uuid
          AND a.technician_id = $2::uuid
          AND a.active = true
        ORDER BY a.assigned_at DESC
        LIMIT 1
      `,
      [params.organizationId, technicianId]
    );

    const first = asObject((rows || [])[0]);
    if (!first?.vehicle_id) return { success: false, error: 'אין לך רכב פעיל' };

    const vehicleId = String(first.vehicle_id);
    const vehicleName = first.vehicle_name ? String(first.vehicle_name) : 'רכב';

    const holderId = await ensureOperationsVehicleHolderId({ organizationId: params.organizationId, vehicleId, label: vehicleName });

    return await setOperationsWorkOrderStockSourceForOrganizationId({
      organizationId: params.organizationId,
      workOrderId,
      holderId,
    });
  } catch (e: unknown) {
    logOperationsError('[operations] setOperationsWorkOrderStockSourceToMyActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקביעת מקור מלאי לרכב הפעיל' };
  }
}

export async function setOperationsWorkOrderStockSourceToMyActiveVehicleAutoForOrganizationId(params: {
  organizationId: string;
  orgSlug?: string;
  workOrderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const currentUser = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(params.organizationId);
    const currentUserObj = asObject(currentUser) ?? {};
    const technicianId = String(currentUserObj.profileId ?? '').trim();
    if (!technicianId) return { success: false, error: 'לא נמצא טכנאי מחובר' };

    return await setOperationsWorkOrderStockSourceToMyActiveVehicleForOrganizationId({
      organizationId: params.organizationId,
      orgSlug: params.orgSlug,
      workOrderId,
      technicianId,
    });
  } catch (e: unknown) {
    logOperationsError('[operations] setOperationsWorkOrderStockSourceToMyActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקביעת מקור מלאי לרכב הפעיל' };
  }
}

export async function getOperationsInventoryOptionsForHolderForOrganizationId(params: {
  organizationId: string;
  holderId: string;
}): Promise<{ success: boolean; data?: OperationsInventoryOption[]; error?: string }> {
  try {
    const holderId = String(params.holderId || '').trim();
    if (!holderId) return { success: false, error: 'חסר מקור מלאי' };

    const hRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text as id
        FROM operations_stock_holders
        WHERE organization_id = $1::uuid
          AND id = $2::uuid
        LIMIT 1
      `,
      [params.organizationId, holderId]
    );
    if (!firstRowField(hRows, 'id')) return { success: false, error: 'מקור מלאי לא תקין' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          inv.id::text as inventory_id,
          i.id::text as item_id,
          i.name as item_name,
          i.sku as item_sku,
          i.unit as item_unit,
          COALESCE(sb.on_hand, 0) as holder_on_hand
        FROM operations_inventory inv
        JOIN operations_items i
          ON i.id = inv.item_id
         AND i.organization_id = inv.organization_id
        LEFT JOIN operations_stock_balances sb
          ON sb.organization_id = inv.organization_id
         AND sb.holder_id = $2::uuid
         AND sb.item_id = inv.item_id
        WHERE inv.organization_id = $1::uuid
        ORDER BY lower(i.name) ASC
      `,
      [params.organizationId, holderId]
    );

    const data: OperationsInventoryOption[] = (rows || []).map((r) => {
      const obj = asObject(r) ?? {};
      const sku = obj.item_sku ? String(obj.item_sku) : '';
      const labelBase = obj.item_name ? String(obj.item_name) : '';
      const label = sku ? `${labelBase} (${sku})` : labelBase;
      return {
        inventoryId: String(obj.inventory_id),
        itemId: String(obj.item_id),
        label,
        onHand: toNumberSafe(obj.holder_on_hand),
        unit: obj.item_unit ? String(obj.item_unit) : null,
      };
    });

    return { success: true, data };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsInventoryOptionsForHolder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מלאי לפי מקור' };
  }
}

export async function consumeOperationsInventoryForWorkOrderForOrganizationId(params: {
  organizationId: string;
  workOrderId: string;
  inventoryId: string;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    const inventoryId = String(params.inventoryId || '').trim();
    const qty = Number(params.qty);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!inventoryId) return { success: false, error: 'חובה לבחור פריט' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'כמות לא תקינה' };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const woRows = await orgQuery<unknown[]>(
        tx,
        params.organizationId,
        `
          SELECT
            id::text as id,
            assigned_technician_id::text as assigned_technician_id,
            stock_source_holder_id::text as stock_source_holder_id
          FROM operations_work_orders
          WHERE organization_id = $1::uuid
            AND id = $2::uuid
          LIMIT 1
        `,
        [params.organizationId, workOrderId]
      );
      const woRow = asObject((woRows || [])[0]);
      if (!woRow?.id) throw new Error('קריאה לא נמצאה או שאין הרשאה');

      const assignedTechnicianId = woRow.assigned_technician_id ? String(woRow.assigned_technician_id) : null;
      let sourceHolderId = woRow.stock_source_holder_id ? String(woRow.stock_source_holder_id) : null;
      if (!sourceHolderId) {
        sourceHolderId = assignedTechnicianId
          ? await resolveDefaultOperationsStockSourceHolderIdForTechnicianTx(tx, {
              organizationId: params.organizationId,
              technicianId: assignedTechnicianId,
            })
          : await ensureOperationsPrimaryWarehouseHolderIdTx(tx, { organizationId: params.organizationId });

        await orgExec(
          tx,
          params.organizationId,
          `
            UPDATE operations_work_orders
            SET stock_source_holder_id = $1::uuid
            WHERE id = $2::uuid
              AND organization_id = $3::uuid
              AND stock_source_holder_id IS NULL
          `,
          [sourceHolderId, workOrderId, params.organizationId]
        );
      }

      const inv = await tx.operationsInventory.findFirst({
        where: { id: inventoryId, organizationId: params.organizationId },
        select: { id: true, itemId: true },
      });
      if (!inv?.id) throw new Error('פריט מלאי לא נמצא או שאין הרשאה');

      await orgExec(
        tx,
        params.organizationId,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [params.organizationId, sourceHolderId, inv.itemId]
      );

      const decCount = await orgExec(
        tx,
        params.organizationId,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand - $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
            AND on_hand >= $1::numeric
        `,
        [qty, params.organizationId, sourceHolderId, inv.itemId]
      );

      if (Number(decCount) !== 1) throw new Error('אין מספיק מלאי במקור שנבחר');

      const updated = await tx.operationsInventory.updateMany({
        where: { organizationId: params.organizationId, itemId: inv.itemId, onHand: { gte: qty } },
        data: { onHand: { decrement: qty } },
      });
      if (updated.count !== 1) throw new Error('אין מספיק מלאי');

      await orgExec(
        tx,
        params.organizationId,
        `INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type, from_holder_id) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, 'OUT', 'INTERNAL', $5::uuid)`,
        [params.organizationId, inv.itemId, workOrderId, qty, sourceHolderId]
      );
    });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] consumeOperationsInventoryForWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בהורדת מלאי' };
  }
}

export async function getOperationsMaterialsForWorkOrderForOrganizationId(params: {
  organizationId: string;
  workOrderId: string;
}): Promise<{
  success: boolean;
  data?: Array<{ id: string; itemLabel: string; qty: number; createdAt: string }>;
  error?: string;
}> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          m.id::text as id,
          m.qty::numeric as qty,
          m.created_at as created_at,
          i.name as item_name,
          i.sku as item_sku
        FROM operations_stock_movements m
        JOIN operations_items i ON i.id = m.item_id
        WHERE m.organization_id = $1::uuid
          AND m.work_order_id = $2::uuid
        ORDER BY m.created_at DESC
      `,
      [params.organizationId, workOrderId]
    );

    return {
      success: true,
      data: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        const sku = obj.item_sku ? String(obj.item_sku) : '';
        const label = sku ? `${String(obj.item_name)} (${sku})` : String(obj.item_name);
        return {
          id: String(obj.id),
          itemLabel: label,
          qty: Number(obj.qty),
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsMaterialsForWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת חומרים לקריאה' };
  }
}
