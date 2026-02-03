import 'server-only';

import type { Prisma } from '@prisma/client';

import { orgQuery, prisma } from '@/lib/services/operations/db';
import { firstRowField } from '@/lib/services/operations/shared';

export async function ensureOperationsPrimaryWarehouseHolderId(params: { organizationId: string }): Promise<string> {
  const orgId = String(params.organizationId || '').trim();
  if (!orgId) throw new Error('Missing organizationId');

  const rows = await orgQuery<unknown[]>(
    prisma,
    orgId,
    `
      SELECT h.id::text as id
      FROM operations_locations l
      JOIN operations_stock_holders h
        ON h.location_id = l.id
       AND h.organization_id = l.organization_id
      WHERE l.organization_id = $1::uuid
        AND lower(l.name) = lower('מחסן ראשי')
      LIMIT 1
    `,
    [orgId]
  );
  const existingId = firstRowField(rows, 'id');
  if (existingId) return existingId;

  const locRows = await orgQuery<unknown[]>(
    prisma,
    orgId,
    `
      INSERT INTO operations_locations (organization_id, name)
      VALUES ($1::uuid, 'מחסן ראשי')
      ON CONFLICT DO NOTHING
      RETURNING id::text as id
    `,
    [orgId]
  );

  let locId = firstRowField(locRows, 'id');
  if (!locId) {
    const existingLocRows = await orgQuery<unknown[]>(
      prisma,
      orgId,
      `SELECT id::text as id FROM operations_locations WHERE organization_id = $1::uuid AND lower(name) = lower('מחסן ראשי') LIMIT 1`,
      [orgId]
    );
    locId = firstRowField(existingLocRows, 'id');
  }
  if (!locId) throw new Error('Failed to ensure warehouse location');

  const holderRows = await orgQuery<unknown[]>(
    prisma,
    orgId,
    `
      INSERT INTO operations_stock_holders (organization_id, type, label, location_id)
      VALUES ($1::uuid, 'LOCATION', 'מחסן ראשי', $2::uuid)
      ON CONFLICT DO NOTHING
      RETURNING id::text as id
    `,
    [orgId, locId]
  );

  const holderId = firstRowField(holderRows, 'id');
  if (holderId) return holderId;

  const holderRows2 = await orgQuery<unknown[]>(
    prisma,
    orgId,
    `SELECT id::text as id FROM operations_stock_holders WHERE organization_id = $1::uuid AND location_id = $2::uuid LIMIT 1`,
    [orgId, locId]
  );
  const holderId2 = firstRowField(holderRows2, 'id');
  if (!holderId2) throw new Error('Failed to ensure warehouse holder');
  return holderId2;
}

export async function ensureOperationsPrimaryWarehouseHolderIdTx(
  tx: Prisma.TransactionClient,
  params: { organizationId: string }
): Promise<string> {
  const orgId = String(params.organizationId || '').trim();
  if (!orgId) throw new Error('Missing organizationId');

  const rows = await orgQuery<unknown[]>(
    tx,
    orgId,
    `
      SELECT h.id::text as id
      FROM operations_locations l
      JOIN operations_stock_holders h
        ON h.location_id = l.id
       AND h.organization_id = l.organization_id
      WHERE l.organization_id = $1::uuid
        AND lower(l.name) = lower('מחסן ראשי')
      LIMIT 1
    `,
    [orgId]
  );
  const existingId = firstRowField(rows, 'id');
  if (existingId) return existingId;

  const locRows = await orgQuery<unknown[]>(
    tx,
    orgId,
    `
      INSERT INTO operations_locations (organization_id, name)
      VALUES ($1::uuid, 'מחסן ראשי')
      ON CONFLICT DO NOTHING
      RETURNING id::text as id
    `,
    [orgId]
  );

  let locId = firstRowField(locRows, 'id');
  if (!locId) {
    const existingLocRows = await orgQuery<unknown[]>(
      tx,
      orgId,
      `SELECT id::text as id FROM operations_locations WHERE organization_id = $1::uuid AND lower(name) = lower('מחסן ראשי') LIMIT 1`,
      [orgId]
    );
    locId = firstRowField(existingLocRows, 'id');
  }
  if (!locId) throw new Error('Failed to ensure warehouse location');

  const holderRows = await orgQuery<unknown[]>(
    tx,
    orgId,
    `
      INSERT INTO operations_stock_holders (organization_id, type, label, location_id)
      VALUES ($1::uuid, 'LOCATION', 'מחסן ראשי', $2::uuid)
      ON CONFLICT DO NOTHING
      RETURNING id::text as id
    `,
    [orgId, locId]
  );

  const holderId = firstRowField(holderRows, 'id');
  if (holderId) return holderId;

  const holderRows2 = await orgQuery<unknown[]>(
    tx,
    orgId,
    `SELECT id::text as id FROM operations_stock_holders WHERE organization_id = $1::uuid AND location_id = $2::uuid LIMIT 1`,
    [orgId, locId]
  );
  const holderId2 = firstRowField(holderRows2, 'id');
  if (!holderId2) throw new Error('Failed to ensure warehouse holder');
  return holderId2;
}

export async function ensureOperationsVehicleHolderId(params: {
  organizationId: string;
  vehicleId: string;
  label: string;
}): Promise<string> {
  const orgId = String(params.organizationId || '').trim();
  const vehicleId = String(params.vehicleId || '').trim();
  const label = String(params.label || '').trim() || 'רכב';
  if (!orgId || !vehicleId) throw new Error('Missing organizationId/vehicleId');

  const rows = await orgQuery<unknown[]>(
    prisma,
    orgId,
    `SELECT id::text as id FROM operations_stock_holders WHERE organization_id = $1::uuid AND vehicle_id = $2::uuid LIMIT 1`,
    [orgId, vehicleId]
  );
  const existingId = firstRowField(rows, 'id');
  if (existingId) return existingId;

  const ins = await orgQuery<unknown[]>(
    prisma,
    orgId,
    `
      INSERT INTO operations_stock_holders (organization_id, type, label, vehicle_id)
      VALUES ($1::uuid, 'VEHICLE', $2::text, $3::uuid)
      ON CONFLICT DO NOTHING
      RETURNING id::text as id
    `,
    [orgId, label, vehicleId]
  );
  const createdId = firstRowField(ins, 'id');
  if (createdId) return createdId;

  const rows2 = await orgQuery<unknown[]>(
    prisma,
    orgId,
    `SELECT id::text as id FROM operations_stock_holders WHERE organization_id = $1::uuid AND vehicle_id = $2::uuid LIMIT 1`,
    [orgId, vehicleId]
  );
  const id2 = firstRowField(rows2, 'id');
  if (!id2) throw new Error('Failed to ensure vehicle holder');
  return id2;
}

export async function ensureOperationsVehicleHolderIdTx(
  tx: Prisma.TransactionClient,
  params: { organizationId: string; vehicleId: string; label: string }
): Promise<string> {
  const orgId = String(params.organizationId || '').trim();
  const vehicleId = String(params.vehicleId || '').trim();
  const label = String(params.label || '').trim() || 'רכב';
  if (!orgId || !vehicleId) throw new Error('Missing organizationId/vehicleId');

  const rows = await orgQuery<unknown[]>(
    tx,
    orgId,
    `SELECT id::text as id FROM operations_stock_holders WHERE organization_id = $1::uuid AND vehicle_id = $2::uuid LIMIT 1`,
    [orgId, vehicleId]
  );
  const existingId = firstRowField(rows, 'id');
  if (existingId) return existingId;

  const ins = await orgQuery<unknown[]>(
    tx,
    orgId,
    `
      INSERT INTO operations_stock_holders (organization_id, type, label, vehicle_id)
      VALUES ($1::uuid, 'VEHICLE', $2::text, $3::uuid)
      ON CONFLICT DO NOTHING
      RETURNING id::text as id
    `,
    [orgId, label, vehicleId]
  );
  const createdId = firstRowField(ins, 'id');
  if (createdId) return createdId;

  const rows2 = await orgQuery<unknown[]>(
    tx,
    orgId,
    `SELECT id::text as id FROM operations_stock_holders WHERE organization_id = $1::uuid AND vehicle_id = $2::uuid LIMIT 1`,
    [orgId, vehicleId]
  );
  const id2 = firstRowField(rows2, 'id');
  if (!id2) throw new Error('Failed to ensure vehicle holder');
  return id2;
}

export async function resolveDefaultOperationsStockSourceHolderIdForTechnician(params: {
  organizationId: string;
  technicianId: string;
}): Promise<string> {
  const orgId = String(params.organizationId || '').trim();
  const technicianId = String(params.technicianId || '').trim();
  if (!orgId || !technicianId) return ensureOperationsPrimaryWarehouseHolderId({ organizationId: orgId });

  const rows = await orgQuery<unknown[]>(
    prisma,
    orgId,
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
    [orgId, technicianId]
  );
  const vehicleIdVal = firstRowField(rows, 'vehicle_id');
  if (vehicleIdVal) {
    const vehicleId = vehicleIdVal;
    const vehicleName = firstRowField(rows, 'vehicle_name') || 'רכב';
    return ensureOperationsVehicleHolderId({ organizationId: orgId, vehicleId, label: vehicleName });
  }

  return ensureOperationsPrimaryWarehouseHolderId({ organizationId: orgId });
}

export async function resolveDefaultOperationsStockSourceHolderIdForTechnicianTx(
  tx: Prisma.TransactionClient,
  params: { organizationId: string; technicianId: string }
): Promise<string> {
  const orgId = String(params.organizationId || '').trim();
  const technicianId = String(params.technicianId || '').trim();
  if (!orgId || !technicianId) return ensureOperationsPrimaryWarehouseHolderIdTx(tx, { organizationId: orgId });

  const rows = await orgQuery<unknown[]>(
    tx,
    orgId,
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
    [orgId, technicianId]
  );
  const vehicleIdVal = firstRowField(rows, 'vehicle_id');
  if (vehicleIdVal) {
    const vehicleId = vehicleIdVal;
    const vehicleName = firstRowField(rows, 'vehicle_name') || 'רכב';
    return ensureOperationsVehicleHolderIdTx(tx, { organizationId: orgId, vehicleId, label: vehicleName });
  }
  return ensureOperationsPrimaryWarehouseHolderIdTx(tx, { organizationId: orgId });
}

export async function resolveOperationsStockHolderLabel(params: {
  organizationId: string;
  holderId: string;
}): Promise<string | null> {
  const orgId = String(params.organizationId || '').trim();
  const holderId = String(params.holderId || '').trim();
  if (!orgId || !holderId) return null;
  const rows = await orgQuery<unknown[]>(
    prisma,
    orgId,
    `SELECT label FROM operations_stock_holders WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
    [orgId, holderId]
  );
  const label = firstRowField(rows, 'label');
  return label ? String(label) : null;
}
