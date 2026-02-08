import 'server-only';

import { orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toNumberSafe } from '@/lib/services/operations/shared';
import {
  ensureOperationsPrimaryWarehouseHolderId,
  ensureOperationsVehicleHolderId,
  resolveOperationsStockHolderLabel,
} from '@/lib/services/operations/stock-holders';
import { getOperationsVehiclesByOrganizationId } from '@/lib/services/operations/vehicles';
import type { OperationsInventoryOption, OperationsStockSourceOption, OperationsVehicleRow } from '@/lib/services/operations/types';

export async function getOperationsStockSourceOptionsForOrganizationId(params: {
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

export async function getOperationsStockSourceOptionsAutoForOrganizationId(params: {
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

export async function getOperationsInventoryOptionsForOrganizationId(params: {
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
