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
  ensureOperationsPrimaryWarehouseHolderId,
  ensureOperationsPrimaryWarehouseHolderIdTx,
  ensureOperationsVehicleHolderId,
  ensureOperationsVehicleHolderIdTx,
  resolveDefaultOperationsStockSourceHolderIdForTechnicianTx,
  resolveOperationsStockHolderLabel,
} from '@/lib/services/operations/stock-holders';
import { getOperationsVehiclesByOrganizationId } from '@/lib/services/operations/vehicles';
import type {
  OperationsHolderStockRow,
  OperationsInventoryData,
  OperationsInventoryOption,
  OperationsStockSourceOption,
  OperationsVehicleRow,
} from '@/lib/services/operations/types';

async function createOperationsItemForOrganizationId(params: {
  organizationId: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
}): Promise<{ success: boolean; data?: { itemId: string }; error?: string }> {
  try {
    const name = String(params.name || '').trim();
    const sku = params.sku === undefined || params.sku === null ? null : String(params.sku || '').trim();
    const unit = params.unit === undefined || params.unit === null ? null : String(params.unit || '').trim();

    if (!name) return { success: false, error: 'חובה להזין שם פריט' };

    const created = await prisma.operationsItem.create({
      data: {
        organizationId: params.organizationId,
        name,
        sku: sku ? sku : null,
        unit: unit ? unit : null,
      },
      select: { id: true },
    });

    await prisma.operationsInventory.upsert({
      where: { organizationId_itemId: { organizationId: params.organizationId, itemId: created.id } },
      create: {
        organizationId: params.organizationId,
        itemId: created.id,
        onHand: 0,
        minLevel: 0,
      },
      update: {},
    });

    const whHolderId = await ensureOperationsPrimaryWarehouseHolderId({ organizationId: params.organizationId });
    await orgExec(
      prisma,
      params.organizationId,
      `
        INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
        VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
        ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
      `,
      [params.organizationId, whHolderId, created.id]
    );

    return { success: true, data: { itemId: String(created.id) } };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsItem failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פריט' };
  }
}

async function setOperationsWorkOrderStockSourceToMyActiveVehicleAutoForOrganizationId(params: {
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

async function getOperationsStockSourceOptionsForOrganizationId(params: {
  organizationId: string;
  orgSlug?: string;
  vehicles: OperationsVehicleRow[];
}): Promise<{ success: boolean; data?: OperationsStockSourceOption[]; error?: string }> {
  try {
    const warehouseHolderId = await ensureOperationsPrimaryWarehouseHolderId({ organizationId: params.organizationId });
    const warehouseLabel = await resolveOperationsStockHolderLabel({ organizationId: params.organizationId, holderId: warehouseHolderId });

    const vehicleOptions: OperationsStockSourceOption[] = [];
    for (const v of params.vehicles || []) {
      const holderId = await ensureOperationsVehicleHolderId({
        organizationId: params.organizationId,
        vehicleId: v.id,
        label: v.name,
      });
      vehicleOptions.push({ holderId, label: v.name, group: 'VEHICLE' });
    }

    const techRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          p.id::text as technician_id,
          COALESCE(NULLIF(p.full_name, ''), NULLIF(p.email, ''), p.id::text) as technician_label,
          a.vehicle_id::text as vehicle_id,
          v.name as vehicle_name
        FROM operations_technician_vehicle_assignments a
        JOIN profiles p
          ON p.id = a.technician_id
         AND p.organization_id = a.organization_id
        JOIN operations_vehicles v
          ON v.id = a.vehicle_id
         AND v.organization_id = a.organization_id
        WHERE a.organization_id = $1::uuid
          AND a.active = true
        ORDER BY lower(COALESCE(NULLIF(p.full_name, ''), NULLIF(p.email, ''), p.id::text)) ASC
      `,
      [params.organizationId]
    );

    const techOptions: OperationsStockSourceOption[] = [];
    for (const r of techRows || []) {
      const obj = asObject(r) ?? {};
      const vehicleId = String(obj.vehicle_id ?? '').trim();
      const vehicleName = String(obj.vehicle_name ?? '').trim();
      if (!vehicleId) continue;
      const holderId = await ensureOperationsVehicleHolderId({
        organizationId: params.organizationId,
        vehicleId,
        label: vehicleName,
      });
      const label = `${String(obj.technician_label ?? '')} (${vehicleName})`;
      techOptions.push({ holderId, label, group: 'TECHNICIAN' });
    }

    const data: OperationsStockSourceOption[] = [];
    data.push({ holderId: warehouseHolderId, label: warehouseLabel || 'מחסן', group: 'WAREHOUSE' });
    data.push(...vehicleOptions);
    data.push(...techOptions);
    return { success: true, data };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsStockSourceOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מקורות מלאי' };
  }
}

async function getOperationsStockSourceOptionsAutoForOrganizationId(params: {
  organizationId: string;
  orgSlug?: string;
}): Promise<{ success: boolean; data?: OperationsStockSourceOption[]; error?: string }> {
  const vehiclesRes = await getOperationsVehiclesByOrganizationId({ organizationId: params.organizationId });
  const vehicles = vehiclesRes.success ? vehiclesRes.data ?? [] : [];
  return await getOperationsStockSourceOptionsForOrganizationId({
    organizationId: params.organizationId,
    orgSlug: params.orgSlug,
    vehicles,
  });
}

async function setOperationsWorkOrderStockSourceForOrganizationId(params: {
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

async function setOperationsWorkOrderStockSourceToMyActiveVehicleForOrganizationId(params: {
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

async function getOperationsVehicleStockBalancesForOrganizationId(params: {
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

async function transferOperationsStockToVehicleForOrganizationId(params: {
  organizationId: string;
  vehicleId: string;
  itemId: string;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const vehicleId = String(params.vehicleId || '').trim();
    const itemId = String(params.itemId || '').trim();
    const qty = Number(params.qty);

    if (!vehicleId) return { success: false, error: 'חסר רכב' };
    if (!itemId) return { success: false, error: 'חסר פריט' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'כמות לא תקינה' };

    const vRows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `SELECT id::text as id, name FROM operations_vehicles WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
      [params.organizationId, vehicleId]
    );
    const vFirst = asObject((vRows || [])[0]);
    if (!vFirst?.id) return { success: false, error: 'רכב לא נמצא או שאין הרשאה' };
    const vehicleName = String(vFirst.name);

    const whHolderId = await ensureOperationsPrimaryWarehouseHolderId({ organizationId: params.organizationId });
    const vehicleHolderId = await ensureOperationsVehicleHolderId({ organizationId: params.organizationId, vehicleId, label: vehicleName });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Best effort ensure rows exist
      await orgExec(
        tx,
        params.organizationId,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [params.organizationId, whHolderId, itemId]
      );

      await orgExec(
        tx,
        params.organizationId,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [params.organizationId, vehicleHolderId, itemId]
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
        [qty, params.organizationId, whHolderId, itemId]
      );
      if (Number(decCount) !== 1) throw new Error('אין מספיק מלאי במחסן');

      await orgExec(
        tx,
        params.organizationId,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand + $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
        `,
        [qty, params.organizationId, vehicleHolderId, itemId]
      );

      await orgExec(
        tx,
        params.organizationId,
        `
          INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type, from_holder_id, to_holder_id)
          VALUES ($1::uuid, $2::uuid, NULL, $3::numeric, 'TRANSFER', 'INTERNAL', $4::uuid, $5::uuid)
        `,
        [params.organizationId, itemId, qty, whHolderId, vehicleHolderId]
      );
    });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] transferOperationsStockToVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בהעברת מלאי לרכב' };
  }
}

async function addOperationsStockToActiveVehicleForOrganizationId(params: {
  organizationId: string;
  technicianId: string;
  itemId: string;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const technicianId = String(params.technicianId || '').trim();
    const itemId = String(params.itemId || '').trim();
    const qty = Number(params.qty);

    if (!technicianId) return { success: false, error: 'חסר טכנאי' };
    if (!itemId) return { success: false, error: 'חסר פריט' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'כמות לא תקינה' };

    const tech = await prisma.profile.findFirst({
      where: { id: technicianId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!tech?.id) return { success: false, error: 'טכנאי לא תקין או שאין הרשאה' };

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

    const vehicleIdVal = firstRowField(rows, 'vehicle_id');
    if (!vehicleIdVal) {
      return { success: false, error: 'אין רכב פעיל לטכנאי. הגדירו רכב פעיל ואז נסו שוב.' };
    }

    const vehicleId = vehicleIdVal;
    const vehicleName = firstRowField(rows, 'vehicle_name') || 'רכב';

    const whHolderId = await ensureOperationsPrimaryWarehouseHolderId({ organizationId: params.organizationId });
    const vehicleHolderId = await ensureOperationsVehicleHolderId({
      organizationId: params.organizationId,
      vehicleId,
      label: vehicleName,
    });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.operationsInventory.upsert({
        where: { organizationId_itemId: { organizationId: params.organizationId, itemId } },
        create: {
          organizationId: params.organizationId,
          itemId,
          onHand: qty,
          minLevel: 0,
        },
        update: {
          onHand: { increment: qty },
        },
      });

      await orgExec(
        tx,
        params.organizationId,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [params.organizationId, whHolderId, itemId]
      );

      await orgExec(
        tx,
        params.organizationId,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [params.organizationId, vehicleHolderId, itemId]
      );

      await orgExec(
        tx,
        params.organizationId,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand + $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
        `,
        [qty, params.organizationId, whHolderId, itemId]
      );

      await orgExec(
        tx,
        params.organizationId,
        `
          INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type, from_holder_id, to_holder_id)
          VALUES ($1::uuid, $2::uuid, NULL, $3::numeric, 'IN', 'INTERNAL', NULL, $4::uuid)
        `,
        [params.organizationId, itemId, qty, whHolderId]
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
        [qty, params.organizationId, whHolderId, itemId]
      );
      if (Number(decCount) !== 1) throw new Error('אין מספיק מלאי במחסן');

      await orgExec(
        tx,
        params.organizationId,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand + $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
        `,
        [qty, params.organizationId, vehicleHolderId, itemId]
      );

      await orgExec(
        tx,
        params.organizationId,
        `
          INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type, from_holder_id, to_holder_id)
          VALUES ($1::uuid, $2::uuid, NULL, $3::numeric, 'TRANSFER', 'INTERNAL', $4::uuid, $5::uuid)
        `,
        [params.organizationId, itemId, qty, whHolderId, vehicleHolderId]
      );
    });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] addOperationsStockToActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקליטת מלאי לרכב' };
  }
}

async function getOperationsInventoryOptionsForOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsInventoryOption[]; error?: string }> {
  try {
    const rows = await prisma.operationsInventory.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { item: { name: 'asc' } },
      select: {
        id: true,
        onHand: true,
        item: { select: { id: true, name: true, unit: true, sku: true } },
      },
    });

    const data: OperationsInventoryOption[] = rows.map((r) => {
      const sku = r.item.sku ? String(r.item.sku) : '';
      const label = sku ? `${r.item.name} (${sku})` : r.item.name;
      return {
        inventoryId: r.id,
        itemId: r.item.id,
        label,
        onHand: toNumberSafe(r.onHand),
        unit: r.item.unit ? String(r.item.unit) : null,
      };
    });

    return { success: true, data };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsInventoryOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי' };
  }
}

async function getOperationsInventoryOptionsForHolderForOrganizationId(params: {
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

async function consumeOperationsInventoryForWorkOrderForOrganizationId(params: {
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

      // Ensure balances row exists for the selected source (best effort)
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

      // Decrement from source holder
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

      // Decrement global inventory total (existing behavior)
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

async function getOperationsMaterialsForWorkOrderForOrganizationId(params: {
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

async function getOperationsInventoryDataForOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsInventoryData; error?: string }> {
  try {
    const rows = await prisma.operationsInventory.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { item: { name: 'asc' } },
      select: {
        id: true,
        onHand: true,
        minLevel: true,
        item: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });

    const data: OperationsInventoryData = {
      items: rows.map((r) => ({
        id: r.id,
        itemName: r.item.name,
        sku: r.item.sku,
        onHand: toNumberSafe(r.onHand),
        minLevel: toNumberSafe(r.minLevel),
      })),
    };

    return { success: true, data };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsInventoryData failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי' };
  }
}

export { createOperationsItemForOrganizationId } from '@/lib/services/operations/stock/items';
export {
  getOperationsStockSourceOptionsAutoForOrganizationId,
  getOperationsStockSourceOptionsForOrganizationId,
} from '@/lib/services/operations/stock/options';
export {
  consumeOperationsInventoryForWorkOrderForOrganizationId,
  getOperationsInventoryOptionsForHolderForOrganizationId,
  getOperationsMaterialsForWorkOrderForOrganizationId,
  setOperationsWorkOrderStockSourceForOrganizationId,
  setOperationsWorkOrderStockSourceToMyActiveVehicleAutoForOrganizationId,
  setOperationsWorkOrderStockSourceToMyActiveVehicleForOrganizationId,
} from '@/lib/services/operations/stock/work-orders';
export { getOperationsVehicleStockBalancesForOrganizationId } from '@/lib/services/operations/stock/vehicles';
export {
  addOperationsStockToActiveVehicleForOrganizationId,
  transferOperationsStockToVehicleForOrganizationId,
} from '@/lib/services/operations/stock/transfers';
export {
  getOperationsInventoryDataForOrganizationId,
  getOperationsInventoryOptionsForOrganizationId,
} from '@/lib/services/operations/stock/inventory';
