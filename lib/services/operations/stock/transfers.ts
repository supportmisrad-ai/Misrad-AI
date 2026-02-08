import 'server-only';

import type { Prisma } from '@prisma/client';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, firstRowField, getUnknownErrorMessage, logOperationsError, toNumberSafe } from '@/lib/services/operations/shared';
import { ensureOperationsPrimaryWarehouseHolderId, ensureOperationsVehicleHolderId } from '@/lib/services/operations/stock-holders';

export async function transferOperationsStockToVehicleForOrganizationId(params: {
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

export async function addOperationsStockToActiveVehicleForOrganizationId(params: {
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
