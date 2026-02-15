import 'server-only';

import type { Prisma } from '@prisma/client';

import { orgExec, orgQuery, prisma, prismaForInteractiveTransaction } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate } from '@/lib/services/operations/shared';
import type { OperationsVehicleRow } from '@/lib/services/operations/types';

export async function getOperationsVehiclesByOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsVehicleRow[]; error?: string }> {
  try {
    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text as id, name, created_at as created_at
        FROM operations_vehicles
        WHERE organization_id = $1::uuid
        ORDER BY lower(name) ASC
      `,
      [params.organizationId]
    );

    return {
      success: true,
      data: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        return {
          id: String(obj.id ?? ''),
          name: String(obj.name ?? ''),
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsVehicles failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רכבים' };
  }
}

export async function createOperationsVehicleForOrganizationId(params: {
  organizationId: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם רכב' };

    await orgExec(
      prisma,
      params.organizationId,
      `INSERT INTO operations_vehicles (organization_id, name) VALUES ($1::uuid, $2::text)`,
      [params.organizationId, name]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בהוספת רכב' };
  }
}

export async function deleteOperationsVehicleForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה רכב' };

    await prismaForInteractiveTransaction().$transaction(async (tx: Prisma.TransactionClient) => {
      await orgExec(
        tx,
        params.organizationId,
        `DELETE FROM operations_technician_vehicle_assignments WHERE organization_id = $1::uuid AND vehicle_id = $2::uuid`,
        [params.organizationId, id]
      );
      await orgExec(
        tx,
        params.organizationId,
        `DELETE FROM operations_stock_holders WHERE organization_id = $1::uuid AND vehicle_id = $2::uuid`,
        [params.organizationId, id]
      );
      await orgExec(
        tx,
        params.organizationId,
        `DELETE FROM operations_vehicles WHERE organization_id = $1::uuid AND id = $2::uuid`,
        [params.organizationId, id]
      );
    });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת רכב' };
  }
}

export async function getOperationsTechnicianActiveVehicleByOrganizationId(params: {
  organizationId: string;
  technicianId: string;
}): Promise<{ success: boolean; data?: { vehicleId: string | null; vehicleName: string | null }; error?: string }> {
  try {
    const technicianId = String(params.technicianId || '').trim();
    if (!technicianId) return { success: false, error: 'חסר טכנאי' };

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

    const first = (rows || [])[0];
    const obj = asObject(first);
    if (!obj?.vehicle_id) {
      return { success: true, data: { vehicleId: null, vehicleName: null } };
    }

    return {
      success: true,
      data: {
        vehicleId: String(obj.vehicle_id),
        vehicleName: obj.vehicle_name ? String(obj.vehicle_name) : null,
      },
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsTechnicianActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רכב פעיל' };
  }
}
