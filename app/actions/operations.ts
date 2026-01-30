'use server';

import crypto from 'crypto';
import prisma, { executeRawOrgScoped, queryRawAllowlisted, queryRawOrgScoped } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { resolveWorkspaceCurrentUserForUiWithWorkspaceId } from '@/lib/server/workspaceUser';
import { createClient } from '@/lib/supabase';

const OPERATIONS_RAW_REASON = 'operations_raw_sql';

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

function getUnknownErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : null;
}

function isUuidLike(value: string | null | undefined): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function firstRowField(rows: unknown[] | null | undefined, key: string): string | null {
  const first = (rows || [])[0];
  const obj = asObject(first);
  if (!obj) return null;
  const val = obj[key];
  return val === null || val === undefined ? null : String(val);
}

async function orgQuery<T>(db: unknown, organizationId: string, query: string, values: unknown[]): Promise<T> {
  return queryRawOrgScoped<T>(db, {
    organizationId,
    reason: OPERATIONS_RAW_REASON,
    query,
    values,
  });
}

async function orgExec(db: unknown, organizationId: string, query: string, values: unknown[]): Promise<number> {
  return executeRawOrgScoped(db, {
    organizationId,
    reason: OPERATIONS_RAW_REASON,
    query,
    values,
  });
}

export type OperationsClientOption = {
  id: string;
  label: string;
  source: 'nexus' | 'misrad' | 'client';
};

type OperationsDashboardProjectRow = {
  id: string;
  title: string;
  status: string;
  canonicalClientId: string | null;
  updatedAt: Date;
};

export type OperationsDashboardData = {
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    clientName: string | null;
    updatedAt: string;
  }>;
  inventorySummary: {
    ok: number;
    low: number;
    critical: number;
    total: number;
  };
};

export type OperationsProjectsData = {
  projects: Array<{
    id: string;
    title: string;
    status: string;
    clientName: string | null;
    createdAt: string;
  }>;
};

export type OperationsInventoryData = {
  items: Array<{
    id: string;
    itemName: string;
    sku: string | null;
    onHand: number;
    minLevel: number;
  }>;
};

export type OperationsProjectOption = {
  id: string;
  title: string;
};

export type OperationsWorkOrderStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';

export type OperationsWorkOrderRow = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  status: OperationsWorkOrderStatus;
  technicianLabel: string | null;
  installationLat: number | null;
  installationLng: number | null;
};

export type OperationsTechnicianOption = {
  id: string;
  label: string;
};

function parseSbRef(ref: string): { bucket: string; path: string } | null {
  const s = String(ref || '').trim();
  if (!s.startsWith('sb://')) return null;
  const rest = s.slice('sb://'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash).trim();
  const path = rest.slice(slash + 1);
  if (!bucket || !path) return null;
  return { bucket, path };
}

function assertStoragePathScoped(params: {
  rawRef: string;
  path: string;
  organizationId: string;
  orgSlug?: string | null;
}) {
  const orgId = String(params.organizationId || '').trim();
  if (!orgId) {
    throw new Error('[TenantIsolation] Missing organizationId for storage scope validation.');
  }

  const segments = String(params.path || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!segments.length || segments[0] !== orgId) {
    throw new Error(
      `[TenantIsolation] Storage ref blocked: path must start with organizationId. expected=${orgId} ref=${params.rawRef}`
    );
  }

  if (params.orgSlug) {
    const slug = String(params.orgSlug).trim();
    if (slug && !segments.includes(slug)) {
      throw new Error(
        `[TenantIsolation] Storage ref blocked: orgSlug not present in path. expectedSlug=${slug} ref=${params.rawRef}`
      );
    }
  }
}

export type OperationsVehicleRow = {
  id: string;
  name: string;
  createdAt: string;
};

export async function getOperationsVehicles(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsVehicleRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `
        SELECT id::text as id, name, created_at as created_at
        FROM operations_vehicles
        WHERE organization_id = $1::uuid
        ORDER BY lower(name) ASC
      `,
      [workspace.id]
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
    console.error('[operations] getOperationsVehicles failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רכבים' };
  }
}

export async function createOperationsVehicle(params: {
  orgSlug: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם רכב' };

    await orgExec(
      prisma,
      workspace.id,
      `INSERT INTO operations_vehicles (organization_id, name) VALUES ($1::uuid, $2::text)`,
      [workspace.id, name]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] createOperationsVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בהוספת רכב' };
  }
}

export async function createOperationsItem(params: {
  orgSlug: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
}): Promise<{ success: boolean; data?: { itemId: string }; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const name = String(params.name || '').trim();
    const sku = params.sku === undefined || params.sku === null ? null : String(params.sku || '').trim();
    const unit = params.unit === undefined || params.unit === null ? null : String(params.unit || '').trim();

    if (!name) return { success: false, error: 'חובה להזין שם פריט' };

    const created = await prisma.operationsItem.create({
      data: {
        organizationId: workspace.id,
        name,
        sku: sku ? sku : null,
        unit: unit ? unit : null,
      },
      select: { id: true },
    });

    await prisma.operationsInventory.upsert({
      where: { organizationId_itemId: { organizationId: workspace.id, itemId: created.id } },
      create: {
        organizationId: workspace.id,
        itemId: created.id,
        onHand: 0,
        minLevel: 0,
      },
      update: {},
    });

    const whHolderId = await ensureOperationsPrimaryWarehouseHolderId({ organizationId: workspace.id });
    await orgExec(
      prisma,
      workspace.id,
      `
        INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
        VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
        ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
      `,
      [workspace.id, whHolderId, created.id]
    );

    return { success: true, data: { itemId: String(created.id) } };
  } catch (e: unknown) {
    console.error('[operations] createOperationsItem failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פריט' };
  }
}

export async function deleteOperationsVehicle(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה רכב' };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await orgExec(
        tx,
        workspace.id,
        `DELETE FROM operations_technician_vehicle_assignments WHERE organization_id = $1::uuid AND vehicle_id = $2::uuid`,
        [workspace.id, id]
      );
      await orgExec(
        tx,
        workspace.id,
        `DELETE FROM operations_stock_holders WHERE organization_id = $1::uuid AND vehicle_id = $2::uuid`,
        [workspace.id, id]
      );
      await orgExec(
        tx,
        workspace.id,
        `DELETE FROM operations_vehicles WHERE organization_id = $1::uuid AND id = $2::uuid`,
        [workspace.id, id]
      );
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] deleteOperationsVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת רכב' };
  }
}

export async function setOperationsTechnicianActiveVehicle(params: {
  orgSlug: string;
  technicianId: string;
  vehicleId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const technicianId = String(params.technicianId || '').trim();
    const vehicleIdRaw = params.vehicleId === null ? null : String(params.vehicleId || '').trim();
    const vehicleId = vehicleIdRaw ? vehicleIdRaw : null;

    if (!technicianId) return { success: false, error: 'חסר טכנאי' };

    const tech = await prisma.profile.findFirst({
      where: { id: technicianId, organizationId: workspace.id },
      select: { id: true },
    });
    if (!tech?.id) return { success: false, error: 'טכנאי לא תקין או שאין הרשאה' };

    let vehicleName: string | null = null;
    if (vehicleId) {
      const vRows = await orgQuery<unknown[]>(
        prisma,
        workspace.id,
        `SELECT id::text as id, name FROM operations_vehicles WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
        [workspace.id, vehicleId]
      );
      const first = (vRows || [])[0];
      const obj = asObject(first);
      if (!obj?.id) return { success: false, error: 'רכב לא תקין או שאין הרשאה' };
      vehicleName = obj.name ? String(obj.name) : 'רכב';
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await orgExec(
        tx,
        workspace.id,
        `
          UPDATE operations_technician_vehicle_assignments
          SET active = false,
              ended_at = now()
          WHERE organization_id = $1::uuid
            AND technician_id = $2::uuid
            AND active = true
        `,
        [workspace.id, technicianId]
      );

      if (vehicleId) {
        await orgExec(
          tx,
          workspace.id,
          `
            INSERT INTO operations_technician_vehicle_assignments (organization_id, technician_id, vehicle_id, active)
            VALUES ($1::uuid, $2::uuid, $3::uuid, true)
          `,
          [workspace.id, technicianId, vehicleId]
        );

        // Ensure holder exists for this vehicle
        await ensureOperationsVehicleHolderIdTx(tx, {
          organizationId: workspace.id,
          vehicleId,
          label: vehicleName || 'רכב',
        });
      }
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] setOperationsTechnicianActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת רכב פעיל' };
  }
}

export type OperationsStockSourceOption = {
  holderId: string;
  label: string;
  group: 'WAREHOUSE' | 'VEHICLE' | 'TECHNICIAN';
};

export type OperationsHolderStockRow = {
  itemId: string;
  label: string;
  onHand: number;
  unit: string | null;
};

export async function getOperationsTechnicianActiveVehicle(params: {
  orgSlug: string;
  technicianId: string;
}): Promise<{ success: boolean; data?: { vehicleId: string | null; vehicleName: string | null }; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const technicianId = String(params.technicianId || '').trim();
    if (!technicianId) return { success: false, error: 'חסר טכנאי' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
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
      [workspace.id, technicianId]
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
    console.error('[operations] getOperationsTechnicianActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רכב פעיל' };
  }
}

export async function getOperationsStockSourceOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsStockSourceOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const warehouseHolderId = await ensureOperationsPrimaryWarehouseHolderId({ organizationId: workspace.id });
    const warehouseLabel = await resolveOperationsStockHolderLabel({ organizationId: workspace.id, holderId: warehouseHolderId });

    const vehiclesRes = await getOperationsVehicles({ orgSlug: params.orgSlug });
    const vehicles = vehiclesRes.success ? vehiclesRes.data ?? [] : [];

    const vehicleOptions: OperationsStockSourceOption[] = [];
    for (const v of vehicles) {
      const holderId = await ensureOperationsVehicleHolderId({
        organizationId: workspace.id,
        vehicleId: v.id,
        label: v.name,
      });
      vehicleOptions.push({ holderId, label: v.name, group: 'VEHICLE' });
    }

    const techRows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
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
      [workspace.id]
    );

    const techOptions: OperationsStockSourceOption[] = [];
    for (const r of techRows || []) {
      const obj = asObject(r) ?? {};
      const vehicleId = String(obj.vehicle_id ?? '').trim();
      const vehicleName = String(obj.vehicle_name ?? '').trim();
      if (!vehicleId) continue;
      const holderId = await ensureOperationsVehicleHolderId({
        organizationId: workspace.id,
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
    console.error('[operations] getOperationsStockSourceOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מקורות מלאי' };
  }
}

export async function setOperationsWorkOrderStockSource(params: {
  orgSlug: string;
  workOrderId: string;
  holderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    const holderId = String(params.holderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!holderId) return { success: false, error: 'חובה לבחור מקור מלאי' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: workspace.id },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    const hRows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `SELECT id::text as id FROM operations_stock_holders WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
      [workspace.id, holderId]
    );
    const holderRow = asObject((hRows || [])[0]);
    if (!holderRow?.id) return { success: false, error: 'מקור מלאי לא תקין' };

    await orgExec(
      prisma,
      workspace.id,
      `UPDATE operations_work_orders SET stock_source_holder_id = $1::uuid WHERE id = $2::uuid AND organization_id = $3::uuid`,
      [holderId, workOrderId, workspace.id]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] setOperationsWorkOrderStockSource failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת מקור מלאי' };
  }
}

export async function setOperationsWorkOrderStockSourceToMyActiveVehicle(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const currentUser = await resolveWorkspaceCurrentUserForUiWithWorkspaceId(workspace.id);
    const currentUserObj = asObject(currentUser) ?? {};
    const technicianId = String(currentUserObj.profileId ?? '').trim();
    if (!technicianId) return { success: false, error: 'לא נמצא טכנאי מחובר' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
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
      [workspace.id, technicianId]
    );

    const first = asObject((rows || [])[0]);
    if (!first?.vehicle_id) return { success: false, error: 'אין לך רכב פעיל' };
    const vehicleId = String(first.vehicle_id);
    const vehicleName = first.vehicle_name ? String(first.vehicle_name) : 'רכב';

    const holderId = await ensureOperationsVehicleHolderId({ organizationId: workspace.id, vehicleId, label: vehicleName });

    return await setOperationsWorkOrderStockSource({
      orgSlug: params.orgSlug,
      workOrderId,
      holderId,
    });
  } catch (e: unknown) {
    console.error('[operations] setOperationsWorkOrderStockSourceToMyActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקביעת מקור מלאי לרכב הפעיל' };
  }
}

export async function getOperationsVehicleStockBalances(params: {
  orgSlug: string;
  vehicleId: string;
}): Promise<{ success: boolean; data?: OperationsHolderStockRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const vehicleId = String(params.vehicleId || '').trim();
    if (!vehicleId) return { success: false, error: 'חסר רכב' };

    const vRows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `SELECT id::text as id, name FROM operations_vehicles WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
      [workspace.id, vehicleId]
    );
    const vFirst = asObject((vRows || [])[0]);
    if (!vFirst?.id) return { success: false, error: 'רכב לא נמצא או שאין הרשאה' };

    const vehicleName = vFirst.name ? String(vFirst.name) : 'רכב';
    const holderId = await ensureOperationsVehicleHolderId({ organizationId: workspace.id, vehicleId, label: vehicleName });

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
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
      [workspace.id, holderId]
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
    console.error('[operations] getOperationsVehicleStockBalances failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מלאי רכב' };
  }
}

export async function transferOperationsStockToVehicle(params: {
  orgSlug: string;
  vehicleId: string;
  itemId: string;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const vehicleId = String(params.vehicleId || '').trim();
    const itemId = String(params.itemId || '').trim();
    const qty = Number(params.qty);

    if (!vehicleId) return { success: false, error: 'חסר רכב' };
    if (!itemId) return { success: false, error: 'חסר פריט' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'כמות לא תקינה' };

    const vRows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `SELECT id::text as id, name FROM operations_vehicles WHERE organization_id = $1::uuid AND id = $2::uuid LIMIT 1`,
      [workspace.id, vehicleId]
    );
    const vFirst = asObject((vRows || [])[0]);
    if (!vFirst?.id) return { success: false, error: 'רכב לא נמצא או שאין הרשאה' };
    const vehicleName = String(vFirst.name);

    const whHolderId = await ensureOperationsPrimaryWarehouseHolderId({ organizationId: workspace.id });
    const vehicleHolderId = await ensureOperationsVehicleHolderId({ organizationId: workspace.id, vehicleId, label: vehicleName });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Best effort ensure rows exist
      await orgExec(
        tx,
        workspace.id,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [workspace.id, whHolderId, itemId]
      );

      await orgExec(
        tx,
        workspace.id,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [workspace.id, vehicleHolderId, itemId]
      );

      const decCount = await orgExec(
        tx,
        workspace.id,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand - $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
            AND on_hand >= $1::numeric
        `,
        [qty, workspace.id, whHolderId, itemId]
      );
      if (Number(decCount) !== 1) throw new Error('אין מספיק מלאי במחסן');

      await orgExec(
        tx,
        workspace.id,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand + $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
        `,
        [qty, workspace.id, vehicleHolderId, itemId]
      );

      await orgExec(
        tx,
        workspace.id,
        `
          INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type, from_holder_id, to_holder_id)
          VALUES ($1::uuid, $2::uuid, NULL, $3::numeric, 'TRANSFER', 'INTERNAL', $4::uuid, $5::uuid)
        `,
        [workspace.id, itemId, qty, whHolderId, vehicleHolderId]
      );
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] transferOperationsStockToVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בהעברת מלאי לרכב' };
  }
}

export async function addOperationsStockToActiveVehicle(params: {
  orgSlug: string;
  technicianId: string;
  itemId: string;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const technicianId = String(params.technicianId || '').trim();
    const itemId = String(params.itemId || '').trim();
    const qty = Number(params.qty);

    if (!technicianId) return { success: false, error: 'חסר טכנאי' };
    if (!itemId) return { success: false, error: 'חסר פריט' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'כמות לא תקינה' };

    const tech = await prisma.profile.findFirst({
      where: { id: technicianId, organizationId: workspace.id },
      select: { id: true },
    });
    if (!tech?.id) return { success: false, error: 'טכנאי לא תקין או שאין הרשאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
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
      [workspace.id, technicianId]
    );

    const vehicleIdVal = firstRowField(rows, 'vehicle_id');
    if (!vehicleIdVal) {
      return { success: false, error: 'אין רכב פעיל לטכנאי. הגדירו רכב פעיל ואז נסו שוב.' };
    }

    const vehicleId = vehicleIdVal;
    const vehicleName = firstRowField(rows, 'vehicle_name') || 'רכב';

    const whHolderId = await ensureOperationsPrimaryWarehouseHolderId({ organizationId: workspace.id });
    const vehicleHolderId = await ensureOperationsVehicleHolderId({
      organizationId: workspace.id,
      vehicleId,
      label: vehicleName,
    });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.operationsInventory.upsert({
        where: { organizationId_itemId: { organizationId: workspace.id, itemId } },
        create: {
          organizationId: workspace.id,
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
        workspace.id,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [workspace.id, whHolderId, itemId]
      );

      await orgExec(
        tx,
        workspace.id,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [workspace.id, vehicleHolderId, itemId]
      );

      await orgExec(
        tx,
        workspace.id,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand + $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
        `,
        [qty, workspace.id, whHolderId, itemId]
      );

      await orgExec(
        tx,
        workspace.id,
        `
          INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type, from_holder_id, to_holder_id)
          VALUES ($1::uuid, $2::uuid, NULL, $3::numeric, 'IN', 'INTERNAL', NULL, $4::uuid)
        `,
        [workspace.id, itemId, qty, whHolderId]
      );

      const decCount = await orgExec(
        tx,
        workspace.id,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand - $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
            AND on_hand >= $1::numeric
        `,
        [qty, workspace.id, whHolderId, itemId]
      );
      if (Number(decCount) !== 1) throw new Error('אין מספיק מלאי במחסן');

      await orgExec(
        tx,
        workspace.id,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand + $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
        `,
        [qty, workspace.id, vehicleHolderId, itemId]
      );

      await orgExec(
        tx,
        workspace.id,
        `
          INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type, from_holder_id, to_holder_id)
          VALUES ($1::uuid, $2::uuid, NULL, $3::numeric, 'TRANSFER', 'INTERNAL', $4::uuid, $5::uuid)
        `,
        [workspace.id, itemId, qty, whHolderId, vehicleHolderId]
      );
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] addOperationsStockToActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקליטת מלאי לרכב' };
  }
}

async function ensureOperationsPrimaryWarehouseHolderId(params: { organizationId: string }): Promise<string> {
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

async function ensureOperationsPrimaryWarehouseHolderIdTx(
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

async function ensureOperationsVehicleHolderId(params: {
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

async function ensureOperationsVehicleHolderIdTx(
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

async function resolveDefaultOperationsStockSourceHolderIdForTechnician(params: {
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

async function resolveDefaultOperationsStockSourceHolderIdForTechnicianTx(
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

async function resolveOperationsStockHolderLabel(params: {
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

async function resolveStorageUrlMaybe(
  refOrUrl: string | null | undefined,
  ttlSeconds: number,
  scope: { organizationId: string; orgSlug?: string | null }
): Promise<string | null> {
  const raw = refOrUrl === null || refOrUrl === undefined ? '' : String(refOrUrl).trim();
  if (!raw) return null;

  const parsed = parseSbRef(raw);
  if (!parsed) return raw;

  try {
    assertStoragePathScoped({
      rawRef: raw,
      path: parsed.path,
      organizationId: scope.organizationId,
      orgSlug: scope.orgSlug,
    });
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, ttlSeconds);
    if (error || !data?.signedUrl) return null;
    return String(data.signedUrl);
  } catch {
    return null;
  }
}

export type OperationsWorkOrdersData = {
  workOrders: OperationsWorkOrderRow[];
};

export type OperationsInventoryOption = {
  inventoryId: string;
  itemId: string;
  label: string;
  onHand: number;
  unit: string | null;
};

export type OperationsWorkOrderAttachmentRow = {
  id: string;
  url: string;
  mimeType: string | null;
  createdAt: string;
};

export type OperationsWorkOrderCheckinRow = {
  id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  createdAt: string;
};

export type OperationsLocationRow = {
  id: string;
  name: string;
  createdAt: string;
};

export type OperationsWorkOrderTypeRow = {
  id: string;
  name: string;
  createdAt: string;
};

function toNumberSafe(value: unknown): number {
  if (typeof value === 'number') return value;
  const obj = asObject(value);
  const maybeToNumber = obj?.toNumber;
  if (typeof maybeToNumber === 'function') {
    const out = (maybeToNumber as (...args: never[]) => unknown).call(value);
    return typeof out === 'number' ? out : Number(out);
  }
  return Number(value);
}

function normalizeAddress(input: string): string {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export async function getOperationsClientOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsClientOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const [nexusClients, misradClients, clientClients] = await Promise.all([
      prisma.nexusClient.findMany({
        where: { organizationId: workspace.id },
        select: { id: true, companyName: true, name: true },
        orderBy: { companyName: 'asc' },
      }),
      prisma.misradClient.findMany({
        where: { organizationId: workspace.id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.clientClient.findMany({
        where: { organizationId: workspace.id },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const options: OperationsClientOption[] = [];
    const seen = new Set<string>();

    for (const c of nexusClients) {
      const id = String(c.id);
      const label = String(c.companyName || c.name || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'nexus' });
    }

    for (const c of misradClients) {
      const id = String(c.id);
      const label = String(c.name || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'misrad' });
    }

    for (const c of clientClients) {
      const id = String(c.id);
      const label = String(c.fullName || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'client' });
    }

    options.sort((a, b) => a.label.localeCompare(b.label, 'he'));
    return { success: true, data: options };
  } catch (e: unknown) {
    console.error('[operations] getOperationsClientOptions failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הלקוחות',
    };
  }
}

async function setOperationsWorkOrderCompletionSignatureUnsafe(params: {
  organizationId: string;
  workOrderId: string;
  signatureUrl: string;
}) {
  await orgExec(
    prisma,
    params.organizationId,
    `
      UPDATE operations_work_orders
      SET completion_signature_url = $3::text
      WHERE organization_id = $1::uuid
        AND id = $2::uuid
    `,
    [params.organizationId, params.workOrderId, params.signatureUrl]
  );
}

export async function setOperationsWorkOrderCompletionSignature(params: {
  orgSlug: string;
  id: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    const signatureUrl = String(params.signatureUrl || '').trim();

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };
    if (!signatureUrl) return { success: false, error: 'חסר URL חתימה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id, organizationId: workspace.id },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await setOperationsWorkOrderCompletionSignatureUnsafe({ organizationId: workspace.id, workOrderId: id, signatureUrl });
    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] setOperationsWorkOrderCompletionSignature failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת חתימה' };
  }
}

export async function contractorSetWorkOrderCompletionSignature(params: {
  token: string;
  workOrderId: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const signatureUrl = String(params.signatureUrl || '').trim();

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!signatureUrl) return { success: false, error: 'חסר URL חתימה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await setOperationsWorkOrderCompletionSignatureUnsafe({
      organizationId: tokenOut.organizationId,
      workOrderId,
      signatureUrl,
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] contractorSetWorkOrderCompletionSignature failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת חתימה' };
  }
}

export async function addOperationsWorkOrderAttachment(params: {
  orgSlug: string;
  workOrderId: string;
  storageBucket?: string;
  storagePath: string;
  url: string;
  mimeType?: string | null;
  createdByType?: 'INTERNAL' | 'CONTRACTOR';
  createdByRef?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    const storagePath = String(params.storagePath || '').trim();
    const url = String(params.url || '').trim();
    const storageBucket = params.storageBucket ? String(params.storageBucket).trim() : 'operations-files';
    const createdByType = params.createdByType ? String(params.createdByType) : 'INTERNAL';
    const createdByRef = params.createdByRef ? String(params.createdByRef) : null;
    const mimeType = params.mimeType === undefined ? null : params.mimeType === null ? null : String(params.mimeType);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!storagePath) return { success: false, error: 'חסר נתיב קובץ' };
    if (!url) return { success: false, error: 'חסר URL' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: workspace.id },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await orgExec(
      prisma,
      workspace.id,
      `
        INSERT INTO operations_work_order_attachments (
          organization_id,
          work_order_id,
          storage_bucket,
          storage_path,
          url,
          mime_type,
          created_by_type,
          created_by_ref
        ) VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text)
      `,
      [workspace.id, workOrderId, storageBucket, storagePath, url, mimeType, createdByType, createdByRef]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] addOperationsWorkOrderAttachment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת קובץ לקריאה' };
  }
}

export async function getOperationsLocations(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsLocationRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `
        SELECT id::text as id, name, created_at
        FROM operations_locations
        WHERE organization_id = $1::uuid
        ORDER BY created_at DESC
      `,
      [workspace.id]
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
    console.error('[operations] getOperationsLocations failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מחסנים' };
  }
}

export async function createOperationsLocation(params: {
  orgSlug: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם מחסן' };

    await orgExec(
      prisma,
      workspace.id,
      `INSERT INTO operations_locations (organization_id, name) VALUES ($1::uuid, $2::text)`,
      [workspace.id, name]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] createOperationsLocation failed', e);
    const msg = String(getUnknownErrorMessage(e) || '');
    if (msg.toLowerCase().includes('uq_operations_locations_org_name')) {
      return { success: false, error: 'מחסן בשם הזה כבר קיים' };
    }
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת מחסן' };
  }
}

export async function deleteOperationsLocation(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה מחסן' };

    await orgExec(
      prisma,
      workspace.id,
      `DELETE FROM operations_locations WHERE organization_id = $1::uuid AND id = $2::uuid`,
      [workspace.id, id]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] deleteOperationsLocation failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת מחסן' };
  }
}

export async function getOperationsWorkOrderTypes(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderTypeRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `
        SELECT id::text as id, name, created_at
        FROM operations_work_order_types
        WHERE organization_id = $1::uuid
        ORDER BY created_at DESC
      `,
      [workspace.id]
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
    console.error('[operations] getOperationsWorkOrderTypes failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת סוגי קריאות' };
  }
}

export async function createOperationsWorkOrderType(params: {
  orgSlug: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם סוג קריאה' };

    await orgExec(
      prisma,
      workspace.id,
      `INSERT INTO operations_work_order_types (organization_id, name) VALUES ($1::uuid, $2::text)`,
      [workspace.id, name]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] createOperationsWorkOrderType failed', e);
    const msg = String(getUnknownErrorMessage(e) || '');
    if (msg.toLowerCase().includes('uq_operations_work_order_types_org_name')) {
      return { success: false, error: 'סוג קריאה בשם הזה כבר קיים' };
    }
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת סוג קריאה' };
  }
}

export async function deleteOperationsWorkOrderType(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה סוג קריאה' };

    await orgExec(
      prisma,
      workspace.id,
      `DELETE FROM operations_work_order_types WHERE organization_id = $1::uuid AND id = $2::uuid`,
      [workspace.id, id]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] deleteOperationsWorkOrderType failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת סוג קריאה' };
  }
}

async function geocodeAddressNominatim(address: string): Promise<{ lat: number; lng: number } | null> {
  const q = String(address || '').trim();
  if (!q) return null;

  const userAgent =
    (process.env.NOMINATIM_USER_AGENT && String(process.env.NOMINATIM_USER_AGENT).trim()) ||
    'MisradCRM/1.0';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'he-IL,he,en-US,en',
        'User-Agent': userAgent,
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data: unknown = await res.json();
    const first = Array.isArray(data) ? asObject(data[0]) : null;
    const lat = first?.lat ? Number(first.lat) : NaN;
    const lng = first?.lon ? Number(first.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOperationsTechnicianOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsTechnicianOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const profiles = await prisma.profile.findMany({
      where: { organizationId: workspace.id },
      select: { id: true, email: true, fullName: true },
      orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
      take: 2000,
    });

    const options: OperationsTechnicianOption[] = (profiles || [])
      .map((p) => {
        const id = String(p.id || '').trim();
        const name = p.fullName ? String(p.fullName).trim() : '';
        const email = p.email ? String(p.email).trim().toLowerCase() : '';
        const label = name || email || id;
        if (!id || !label) return null;
        return { id, label };
      })
      .filter(Boolean) as OperationsTechnicianOption[];

    options.sort((a, b) => a.label.localeCompare(b.label, 'he'));
    return { success: true, data: options };
  } catch (e: unknown) {
    console.error('[operations] getOperationsTechnicianOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הטכנאים' };
  }
}

export async function setOperationsWorkOrderAssignedTechnician(params: {
  orgSlug: string;
  id: string;
  technicianId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    const technicianIdRaw = params.technicianId === null ? null : String(params.technicianId || '').trim();
    const technicianId = technicianIdRaw ? technicianIdRaw : null;

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };

    if (technicianId) {
      const tech = await prisma.profile.findFirst({
        where: { id: technicianId, organizationId: workspace.id },
        select: { id: true },
      });
      if (!tech?.id) {
        return { success: false, error: 'טכנאי לא תקין או שאין הרשאה' };
      }

      await orgExec(
        prisma,
        workspace.id,
        `UPDATE operations_work_orders SET assigned_technician_id = $1::uuid WHERE id = $2::uuid AND organization_id = $3::uuid`,
        [technicianId, id, workspace.id]
      );
    } else {
      await orgExec(
        prisma,
        workspace.id,
        `UPDATE operations_work_orders SET assigned_technician_id = NULL WHERE id = $1::uuid AND organization_id = $2::uuid`,
        [id, workspace.id]
      );
    }

    // Best effort: set stock source for the work order (only if not already set)
    try {
      const holderId = technicianId
        ? await resolveDefaultOperationsStockSourceHolderIdForTechnician({
            organizationId: workspace.id,
            technicianId,
          })
        : await ensureOperationsPrimaryWarehouseHolderId({ organizationId: workspace.id });

      await orgExec(
        prisma,
        workspace.id,
        `
          UPDATE operations_work_orders
          SET stock_source_holder_id = $1::uuid
          WHERE id = $2::uuid
            AND organization_id = $3::uuid
            AND stock_source_holder_id IS NULL
        `,
        [holderId, id, workspace.id]
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

export async function getOperationsWorkOrderAttachments(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderAttachmentRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `
        SELECT id::text as id, url, mime_type, created_at
        FROM operations_work_order_attachments
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
      `,
      [workspace.id, workOrderId]
    );

    const ttlSeconds = 60 * 60;
    const data = await Promise.all(
      (rows || []).map(async (r) => {
        const obj = asObject(r) ?? {};
        const rawUrl = String(obj.url || '');
        const resolved = await resolveStorageUrlMaybe(rawUrl, ttlSeconds, { organizationId: workspace.id, orgSlug: params.orgSlug });
        return {
          id: String(obj.id),
          url: resolved || rawUrl,
          mimeType: obj.mime_type ? String(obj.mime_type) : null,
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      })
    );

    return { success: true, data };
  } catch (e: unknown) {
    console.error('[operations] getOperationsWorkOrderAttachments failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת קבצים לקריאה' };
  }
}

export async function getOperationsWorkOrderCheckins(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderCheckinRow[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `
        SELECT id::text as id, lat, lng, accuracy, created_at
        FROM operations_work_order_checkins
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [workspace.id, workOrderId]
    );

    return {
      success: true,
      data: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        return {
          id: String(obj.id),
          lat: Number(obj.lat),
          lng: Number(obj.lng),
          accuracy: obj.accuracy === null || obj.accuracy === undefined ? null : Number(obj.accuracy),
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    console.error('[operations] getOperationsWorkOrderCheckins failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת Check-In לקריאה' };
  }
}

export async function addOperationsWorkOrderCheckin(params: {
  orgSlug: string;
  workOrderId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  createdByType?: 'INTERNAL' | 'CONTRACTOR';
  createdByRef?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const accuracy = params.accuracy === undefined ? null : params.accuracy === null ? null : Number(params.accuracy);
    const createdByType = params.createdByType ? String(params.createdByType) : 'INTERNAL';
    const createdByRef = params.createdByRef ? String(params.createdByRef) : null;

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { success: false, error: 'מיקום לא תקין' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: workspace.id },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await orgExec(
      prisma,
      workspace.id,
      `
        INSERT INTO operations_work_order_checkins (organization_id, work_order_id, lat, lng, accuracy, created_by_type, created_by_ref)
        VALUES ($1::uuid, $2::uuid, $3::double precision, $4::double precision, $5::double precision, $6::text, $7::text)
      `,
      [workspace.id, workOrderId, lat, lng, accuracy, createdByType, createdByRef]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] addOperationsWorkOrderCheckin failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת Check-In' };
  }
}

async function resolveOperationsContractorToken(token: string): Promise<{
  ok: boolean;
  organizationId?: string;
  contractorLabel?: string | null;
  tokenHash?: string;
  error?: string;
}> {
  const t = String(token || '').trim();
  if (!t) return { ok: false, error: 'טוקן חסר' };
  if (t.length < 20 || t.length > 200) return { ok: false, error: 'טוקן לא תקין' };
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return { ok: false, error: 'טוקן לא תקין' };
  const tokenHash = hashPortalToken(t);

  const rows = await queryRawAllowlisted<unknown[]>(prisma, {
    reason: 'ops_portal_token_lookup',
    query: `
      SELECT organization_id::text as organization_id, contractor_label, expires_at, revoked_at
      FROM operations_contractor_tokens
      WHERE token_hash = $1::text
      LIMIT 1
    `,
    values: [tokenHash],
  });

  const row = asObject((rows || [])[0]);
  if (!row?.organization_id) return { ok: false, error: 'טוקן לא תקין' };
  const expiresAt = row.expires_at ? new Date(String(row.expires_at)) : null;
  const revokedAt = row.revoked_at ? new Date(String(row.revoked_at)) : null;
  if (revokedAt) return { ok: false, error: 'טוקן בוטל' };
  if (!expiresAt || expiresAt.getTime() < Date.now()) return { ok: false, error: 'טוקן פג תוקף' };

  return {
    ok: true,
    organizationId: String(row.organization_id),
    contractorLabel: row.contractor_label ? String(row.contractor_label) : null,
    tokenHash,
  };
}

export async function contractorResolveTokenForApi(params: {
  token: string;
}): Promise<{ success: boolean; organizationId?: string; tokenHash?: string; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }
    return { success: true, organizationId: tokenOut.organizationId, tokenHash: tokenOut.tokenHash };
  } catch (e: unknown) {
    console.error('[operations] contractorResolveTokenForApi failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה באימות טוקן' };
  }
}

export async function contractorValidateWorkOrderAccess(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    return { success: true, organizationId: tokenOut.organizationId };
  } catch (e: unknown) {
    console.error('[operations] contractorValidateWorkOrderAccess failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה באימות גישה' };
  }
}

export async function contractorGetWorkOrderAttachments(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderAttachmentRow[]; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const organizationId = String(tokenOut.organizationId);

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      organizationId,
      `
        SELECT id::text as id, url, mime_type, created_at
        FROM operations_work_order_attachments
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
      `,
      [organizationId, workOrderId]
    );

    const ttlSeconds = 60 * 60;
    const data = await Promise.all(
      (rows || []).map(async (r) => {
        const obj = asObject(r) ?? {};
        const rawUrl = String(obj.url || '');
        const resolved = await resolveStorageUrlMaybe(rawUrl, ttlSeconds, { organizationId });
        return {
          id: String(obj.id),
          url: resolved || rawUrl,
          mimeType: obj.mime_type ? String(obj.mime_type) : null,
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      })
    );

    return { success: true, data };
  } catch (e: unknown) {
    console.error('[operations] contractorGetWorkOrderAttachments failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת קבצים' };
  }
}

export async function contractorAddWorkOrderAttachment(params: {
  token: string;
  workOrderId: string;
  storageBucket?: string;
  storagePath: string;
  url: string;
  mimeType?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const storagePath = String(params.storagePath || '').trim();
    const url = String(params.url || '').trim();
    const storageBucket = params.storageBucket ? String(params.storageBucket).trim() : 'operations-files';
    const mimeType = params.mimeType === undefined ? null : params.mimeType === null ? null : String(params.mimeType);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!storagePath) return { success: false, error: 'חסר נתיב קובץ' };
    if (!url) return { success: false, error: 'חסר URL' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await orgExec(
      prisma,
      String(tokenOut.organizationId),
      `
        INSERT INTO operations_work_order_attachments (
          organization_id,
          work_order_id,
          storage_bucket,
          storage_path,
          url,
          mime_type,
          created_by_type,
          created_by_ref
        ) VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, 'CONTRACTOR', $7::text)
      `,
      [
        tokenOut.organizationId,
        workOrderId,
        storageBucket,
        storagePath,
        url,
        mimeType,
        tokenOut.tokenHash ? String(tokenOut.tokenHash) : null,
      ]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] contractorAddWorkOrderAttachment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת קובץ' };
  }
}

export async function contractorGetWorkOrderCheckins(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderCheckinRow[]; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      String(tokenOut.organizationId),
      `
        SELECT id::text as id, lat, lng, accuracy, created_at
        FROM operations_work_order_checkins
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [tokenOut.organizationId, workOrderId]
    );

    return {
      success: true,
      data: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        return {
          id: String(obj.id),
          lat: Number(obj.lat),
          lng: Number(obj.lng),
          accuracy: obj.accuracy === null || obj.accuracy === undefined ? null : Number(obj.accuracy),
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    console.error('[operations] contractorGetWorkOrderCheckins failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת Check-Ins' };
  }
}

export async function contractorAddWorkOrderCheckin(params: {
  token: string;
  workOrderId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const accuracy = params.accuracy === undefined ? null : params.accuracy === null ? null : Number(params.accuracy);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { success: false, error: 'מיקום לא תקין' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await orgExec(
      prisma,
      String(tokenOut.organizationId),
      `
        INSERT INTO operations_work_order_checkins (organization_id, work_order_id, lat, lng, accuracy, created_by_type, created_by_ref)
        VALUES ($1::uuid, $2::uuid, $3::double precision, $4::double precision, $5::double precision, 'CONTRACTOR', $6::text)
      `,
      [
        tokenOut.organizationId,
        workOrderId,
        lat,
        lng,
        accuracy,
        tokenOut.tokenHash ? String(tokenOut.tokenHash) : null,
      ]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] contractorAddWorkOrderCheckin failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת Check-In' };
  }
}

export async function getOperationsInventoryOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsInventoryOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const rows = await prisma.operationsInventory.findMany({
      where: { organizationId: workspace.id },
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
    console.error('[operations] getOperationsInventoryOptions failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי',
    };
  }
}

export async function getOperationsInventoryOptionsForHolder(params: {
  orgSlug: string;
  holderId: string;
}): Promise<{ success: boolean; data?: OperationsInventoryOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const holderId = String(params.holderId || '').trim();
    if (!holderId) return { success: false, error: 'חסר מקור מלאי' };

    const hRows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `
        SELECT id::text as id
        FROM operations_stock_holders
        WHERE organization_id = $1::uuid
          AND id = $2::uuid
        LIMIT 1
      `,
      [workspace.id, holderId]
    );
    if (!firstRowField(hRows, 'id')) return { success: false, error: 'מקור מלאי לא תקין' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
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
      [workspace.id, holderId]
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
    console.error('[operations] getOperationsInventoryOptionsForHolder failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מלאי לפי מקור',
    };
  }
}

export async function consumeOperationsInventoryForWorkOrder(params: {
  orgSlug: string;
  workOrderId: string;
  inventoryId: string;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    const inventoryId = String(params.inventoryId || '').trim();
    const qty = Number(params.qty);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!inventoryId) return { success: false, error: 'חובה לבחור פריט' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'כמות לא תקינה' };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const woRows = await orgQuery<unknown[]>(
        tx,
        workspace.id,
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
        [workspace.id, workOrderId]
      );
      const woRow = asObject((woRows || [])[0]);
      if (!woRow?.id) throw new Error('קריאה לא נמצאה או שאין הרשאה');

      const assignedTechnicianId = woRow.assigned_technician_id ? String(woRow.assigned_technician_id) : null;
      let sourceHolderId = woRow.stock_source_holder_id ? String(woRow.stock_source_holder_id) : null;
      if (!sourceHolderId) {
        sourceHolderId = assignedTechnicianId
          ? await resolveDefaultOperationsStockSourceHolderIdForTechnicianTx(tx, {
              organizationId: workspace.id,
              technicianId: assignedTechnicianId,
            })
          : await ensureOperationsPrimaryWarehouseHolderIdTx(tx, { organizationId: workspace.id });

        await orgExec(
          tx,
          workspace.id,
          `
            UPDATE operations_work_orders
            SET stock_source_holder_id = $1::uuid
            WHERE id = $2::uuid
              AND organization_id = $3::uuid
              AND stock_source_holder_id IS NULL
          `,
          [sourceHolderId, workOrderId, workspace.id]
        );
      }

      const inv = await tx.operationsInventory.findFirst({
        where: { id: inventoryId, organizationId: workspace.id },
        select: { id: true, itemId: true },
      });
      if (!inv?.id) {
        throw new Error('פריט מלאי לא נמצא או שאין הרשאה');
      }

      // Ensure balances row exists for the selected source (best effort)
      await orgExec(
        tx,
        workspace.id,
        `
          INSERT INTO operations_stock_balances (organization_id, holder_id, item_id, on_hand, min_level)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 0, 0)
          ON CONFLICT (organization_id, holder_id, item_id) DO NOTHING
        `,
        [workspace.id, sourceHolderId, inv.itemId]
      );

      // Decrement from source holder
      const decCount = await orgExec(
        tx,
        workspace.id,
        `
          UPDATE operations_stock_balances
          SET on_hand = on_hand - $1::numeric,
              updated_at = now()
          WHERE organization_id = $2::uuid
            AND holder_id = $3::uuid
            AND item_id = $4::uuid
            AND on_hand >= $1::numeric
        `,
        [qty, workspace.id, sourceHolderId, inv.itemId]
      );

      if (Number(decCount) !== 1) {
        throw new Error('אין מספיק מלאי במקור שנבחר');
      }

      // Decrement global inventory total (existing behavior)
      const updated = await tx.operationsInventory.updateMany({
        where: { organizationId: workspace.id, itemId: inv.itemId, onHand: { gte: qty } },
        data: { onHand: { decrement: qty } },
      });
      if (updated.count !== 1) {
        throw new Error('אין מספיק מלאי');
      }

      await orgExec(
        tx,
        workspace.id,
        `INSERT INTO operations_stock_movements (organization_id, item_id, work_order_id, qty, direction, created_by_type, from_holder_id) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, 'OUT', 'INTERNAL', $5::uuid)`,
        [workspace.id, inv.itemId, workOrderId, qty, sourceHolderId]
      );
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] consumeOperationsInventoryForWorkOrder failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בהורדת מלאי',
    };
  }
}

export async function getOperationsMaterialsForWorkOrder(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{
  success: boolean;
  data?: Array<{ id: string; itemLabel: string; qty: number; createdAt: string }>;
  error?: string;
}> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
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
      [workspace.id, workOrderId]
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
    console.error('[operations] getOperationsMaterialsForWorkOrder failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת חומרים לקריאה',
    };
  }
}

function generatePortalToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function hashPortalToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createOperationsContractorToken(params: {
  orgSlug: string;
  contractorLabel?: string;
  ttlHours?: number;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const token = generatePortalToken();
    const tokenHash = hashPortalToken(token);
    const ttlHours = Number.isFinite(Number(params.ttlHours)) ? Math.max(1, Number(params.ttlHours)) : 72;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const contractorLabel = params.contractorLabel ? String(params.contractorLabel).trim() : null;

    await orgExec(
      prisma,
      workspace.id,
      `INSERT INTO operations_contractor_tokens (organization_id, token_hash, contractor_label, expires_at) VALUES ($1::uuid, $2::text, $3::text, $4::timestamptz)`,
      [workspace.id, tokenHash, contractorLabel, expiresAt.toISOString()]
    );

    return { success: true, token };
  } catch (e: unknown) {
    console.error('[operations] createOperationsContractorToken failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה ביצירת טוקן קבלן',
    };
  }
}

export async function getOperationsContractorPortalData(params: {
  token: string;
}): Promise<{
  success: boolean;
  data?: {
    organizationId: string | null;
    orgSlug: string | null;
    contractorLabel: string | null;
    workOrders: Array<{
      id: string;
      title: string;
      status: OperationsWorkOrderStatus;
      projectTitle: string;
      installationAddress: string | null;
      scheduledStart: string | null;
    }>;
  };
  error?: string;
}> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }

    const organizationKey = String(tokenOut.organizationId).trim();

    let organizationId = organizationKey;
    let orgSlug: string | null = null;

    if (isUuidLike(organizationKey)) {
      const org = await prisma.social_organizations.findFirst({
        where: { id: organizationKey },
        select: { id: true, slug: true },
      });
      if (org?.id) organizationId = String(org.id);
      orgSlug = org?.slug ? String(org.slug) : null;
    } else {
      const org = await prisma.social_organizations.findFirst({
        where: { slug: organizationKey },
        select: { id: true, slug: true },
      });
      if (!org?.id) {
        return { success: false, error: 'ארגון לא נמצא' };
      }
      organizationId = String(org.id);
      orgSlug = org?.slug ? String(org.slug) : null;
    }

    const workOrders = await prisma.operationsWorkOrder.findMany({
      where: { organizationId, status: { not: 'DONE' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        installationAddress: true,
        scheduledStart: true,
        project: { select: { title: true } },
      },
    });

    return {
      success: true,
      data: {
        organizationId,
        orgSlug,
        contractorLabel: tokenOut.contractorLabel ?? null,
        workOrders: workOrders.map((w) => ({
          id: w.id,
          title: w.title,
          status: String(w.status) as OperationsWorkOrderStatus,
          projectTitle: w.project.title,
          installationAddress: w.installationAddress ? String(w.installationAddress) : null,
          scheduledStart: w.scheduledStart ? w.scheduledStart.toISOString() : null,
        })),
      },
    };
  } catch (e: unknown) {
    console.error('[operations] getOperationsContractorPortalData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת פורטל קבלן',
    };
  }
}

export async function contractorMarkWorkOrderDone(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }

    const organizationId = String(tokenOut.organizationId);

    const updated = await prisma.operationsWorkOrder.updateMany({
      where: { id: workOrderId, organizationId },
      data: { status: 'DONE' },
    });

    if (updated.count < 1) {
      return { success: false, error: 'קריאה לא נמצאה' };
    }

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] contractorMarkWorkOrderDone failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס',
    };
  }
}

async function resolveClientNamesByCanonicalId(canonicalClientIds: string[]): Promise<Map<string, string>> {
  const [nexusClients, misradClients, clientClients] = await Promise.all([
    canonicalClientIds.length
      ? prisma.nexusClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, companyName: true, name: true },
        })
      : Promise.resolve([]),
    canonicalClientIds.length
      ? prisma.misradClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    canonicalClientIds.length
      ? prisma.clientClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
  ]);

  const clientNameById = new Map<string, string>();

  for (const c of nexusClients) {
    const id = String(c.id);
    const label = String(c.companyName || c.name || '').trim();
    if (id && label) clientNameById.set(id, label);
  }

  for (const c of misradClients) {
    const id = String(c.id);
    const label = String(c.name || '').trim();
    if (id && label && !clientNameById.has(id)) clientNameById.set(id, label);
  }

  for (const c of clientClients) {
    const id = String(c.id);
    const label = String(c.fullName || '').trim();
    if (id && label && !clientNameById.has(id)) clientNameById.set(id, label);
  }

  return clientNameById;
}

export async function getOperationsDashboardData(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsDashboardData; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const recentProjects = (await prisma.operationsProject.findMany({
      where: { organizationId: workspace.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        canonicalClientId: true,
        updatedAt: true,
      },
    })) as unknown as OperationsDashboardProjectRow[];

    const canonicalClientIds = Array.from(
      new Set(recentProjects.map((p) => p.canonicalClientId).filter(Boolean))
    ) as string[];

    const clientNameById = await resolveClientNamesByCanonicalId(canonicalClientIds);

    const inventoryRows = await prisma.operationsInventory.findMany({
      where: { organizationId: workspace.id },
      select: { onHand: true, minLevel: true },
    });

    let ok = 0;
    let low = 0;
    let critical = 0;

    for (const row of inventoryRows) {
      const onHand = toNumberSafe(row.onHand);
      const minLevel = toNumberSafe(row.minLevel);

      if (onHand <= 0) {
        critical += 1;
        continue;
      }

      if (minLevel > 0 && onHand < minLevel) {
        low += 1;
        continue;
      }

      ok += 1;
    }

    const data: OperationsDashboardData = {
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        clientName: p.canonicalClientId ? clientNameById.get(p.canonicalClientId) ?? null : null,
        updatedAt: p.updatedAt.toISOString(),
      })),
      inventorySummary: {
        ok,
        low,
        critical,
        total: inventoryRows.length,
      },
    };

    return { success: true, data };
  } catch (e: unknown) {
    console.error('[operations] getOperationsDashboardData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת נתוני הדשבורד',
    };
  }
}

export async function getOperationsProjectsData(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsProjectsData; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const projects = await prisma.operationsProject.findMany({
      where: { organizationId: workspace.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        canonicalClientId: true,
        createdAt: true,
      },
    });

    const canonicalClientIds = Array.from(
      new Set(projects.map((p) => p.canonicalClientId).filter(Boolean))
    ) as string[];

    const clientNameById = await resolveClientNamesByCanonicalId(canonicalClientIds);

    const data: OperationsProjectsData = {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        clientName: p.canonicalClientId ? clientNameById.get(p.canonicalClientId) ?? null : null,
        createdAt: p.createdAt.toISOString(),
      })),
    };

    return { success: true, data };
  } catch (e: unknown) {
    console.error('[operations] getOperationsProjectsData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הפרויקטים',
    };
  }
}

export async function getOperationsInventoryData(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsInventoryData; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const rows = await prisma.operationsInventory.findMany({
      where: { organizationId: workspace.id },
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
    console.error('[operations] getOperationsInventoryData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת המלאי',
    };
  }
}

export async function getOperationsProjectOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsProjectOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const rows = await prisma.operationsProject.findMany({
      where: { organizationId: workspace.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    });

    return {
      success: true,
      data: rows.map((p) => ({ id: p.id, title: p.title })),
    };
  } catch (e: unknown) {
    console.error('[operations] getOperationsProjectOptions failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הפרויקטים',
    };
  }
}

export async function getOperationsWorkOrdersData(params: {
  orgSlug: string;
  status?: 'OPEN' | 'ALL' | OperationsWorkOrderStatus;
  projectId?: string;
  assignedTechnicianId?: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrdersData; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const status = params.status || 'OPEN';
    const projectId = params.projectId ? String(params.projectId).trim() : '';
    const assignedTechnicianId = params.assignedTechnicianId ? String(params.assignedTechnicianId).trim() : '';

    const values: unknown[] = [workspace.id];
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
      workspace.id,
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
          where: { organizationId: workspace.id, id: { in: technicianIds } },
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
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאות',
    };
  }
}

export async function createOperationsWorkOrder(params: {
  orgSlug: string;
  projectId: string;
  title: string;
  description?: string;
  scheduledStart?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const projectId = String(params.projectId || '').trim();
    const title = String(params.title || '').trim();
    const description = String(params.description || '').trim();
    const scheduledStartRaw = String(params.scheduledStart || '').trim();

    if (!title) {
      return { success: false, error: 'חובה להזין כותרת' };
    }

    if (!projectId) {
      return { success: false, error: 'חובה לשייך פרויקט' };
    }

    const project = await prisma.operationsProject.findFirst({
      where: { id: projectId, organizationId: workspace.id },
      select: {
        id: true,
        installationAddress: true,
        addressNormalized: true,
      },
    });

    if (!project?.id) {
      return { success: false, error: 'פרויקט לא נמצא או שאין הרשאה' };
    }

    let scheduledStart: Date | null = null;
    if (scheduledStartRaw) {
      const d = new Date(scheduledStartRaw);
      if (!Number.isNaN(d.getTime())) {
        scheduledStart = d;
      }
    }

    const created = await prisma.operationsWorkOrder.create({
      data: {
        organizationId: workspace.id,
        projectId: project.id,
        title,
        description: description ? description : null,
        status: 'NEW',
        scheduledStart,
        installationAddress: project.installationAddress,
        addressNormalized: project.addressNormalized,
      },
      select: { id: true },
    });

    const address = project.installationAddress ? String(project.installationAddress) : '';
    if (address) {
      const coords = await geocodeAddressNominatim(address);
      if (coords) {
        await orgExec(
          prisma,
          workspace.id,
          `
            UPDATE operations_work_orders
            SET installation_lat = $1::double precision,
                installation_lng = $2::double precision
            WHERE organization_id = $3::uuid
              AND id = $4::uuid
          `,
          [coords.lat, coords.lng, workspace.id, created.id]
        );
      }
    }

    return { success: true, id: created.id };
  } catch (e: unknown) {
    console.error('[operations] createOperationsWorkOrder failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה ביצירת קריאה',
    };
  }
}

export async function getOperationsWorkOrderById(params: {
  orgSlug: string;
  id: string;
}): Promise<{
  success: boolean;
  data?: {
    id: string;
    title: string;
    description: string | null;
    status: OperationsWorkOrderStatus;
    scheduledStart: string | null;
    installationAddress: string | null;
    project: { id: string; title: string };
    assignedTechnicianId: string | null;
    technicianLabel: string | null;
    stockSourceHolderId: string | null;
    stockSourceLabel: string | null;
    completionSignatureUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) {
      return { success: false, error: 'חסר מזהה קריאה' };
    }

    const rows = await orgQuery<unknown[]>(
      prisma,
      workspace.id,
      `
        SELECT
          wo.id::text as id,
          wo.title as title,
          wo.description as description,
          wo.status as status,
          wo.scheduled_start as scheduled_start,
          wo.installation_address as installation_address,
          wo.stock_source_holder_id::text as stock_source_holder_id,
          wo.completion_signature_url as completion_signature_url,
          wo.created_at as created_at,
          wo.updated_at as updated_at,
          wo.project_id::text as project_id,
          p.title as project_title,
          wo.assigned_technician_id::text as assigned_technician_id
        FROM operations_work_orders wo
        JOIN operations_projects p
          ON p.id = wo.project_id
        WHERE wo.organization_id = $1::uuid
          AND wo.id = $2::uuid
        LIMIT 1
      `,
      [workspace.id, id]
    );

    const row = asObject((rows || [])[0]);
    if (!row?.id) {
      return { success: false, error: 'קריאה לא נמצאה' };
    }

    const assignedTechnicianId = row.assigned_technician_id ? String(row.assigned_technician_id) : null;
    let technicianLabel: string | null = null;
    if (assignedTechnicianId) {
      const tech = await prisma.profile.findFirst({
        where: { id: assignedTechnicianId, organizationId: workspace.id },
        select: { id: true, fullName: true, email: true },
      });
      technicianLabel = tech?.id ? String(tech.fullName || tech.email || tech.id) : null;
    }

    const stockSourceHolderIdRaw = row.stock_source_holder_id ? String(row.stock_source_holder_id) : null;
    let stockSourceHolderId: string | null = stockSourceHolderIdRaw;
    if (!stockSourceHolderId) {
      stockSourceHolderId = assignedTechnicianId
        ? await resolveDefaultOperationsStockSourceHolderIdForTechnician({
            organizationId: workspace.id,
            technicianId: assignedTechnicianId,
          })
        : await ensureOperationsPrimaryWarehouseHolderId({ organizationId: workspace.id });

      await orgExec(
        prisma,
        workspace.id,
        `
          UPDATE operations_work_orders
          SET stock_source_holder_id = $1::uuid
          WHERE id = $2::uuid
            AND organization_id = $3::uuid
            AND stock_source_holder_id IS NULL
        `,
        [stockSourceHolderId, id, workspace.id]
      );
    }

    let stockSourceLabel: string | null = null;
    if (stockSourceHolderId) {
      const hRows = await orgQuery<unknown[]>(
        prisma,
        workspace.id,
        `
          SELECT label
          FROM operations_stock_holders
          WHERE organization_id = $1::uuid
            AND id = $2::uuid
          LIMIT 1
        `,
        [workspace.id, stockSourceHolderId]
      );
      stockSourceLabel = firstRowField(hRows, 'label');
    }

    const ttlSeconds = 60 * 60;
    const completionSignatureUrl = await resolveStorageUrlMaybe(
      row.completion_signature_url ? String(row.completion_signature_url) : null,
      ttlSeconds,
      { organizationId: workspace.id, orgSlug: params.orgSlug }
    );

    return {
      success: true,
      data: {
        id: String(row.id),
        title: String(row.title),
        description: row.description === null || row.description === undefined ? null : String(row.description),
        status: String(row.status) as OperationsWorkOrderStatus,
        scheduledStart: row.scheduled_start ? toIsoDate(row.scheduled_start) : null,
        installationAddress: row.installation_address ? String(row.installation_address) : null,
        project: { id: String(row.project_id), title: String(row.project_title) },
        assignedTechnicianId,
        technicianLabel,
        stockSourceHolderId,
        stockSourceLabel,
        completionSignatureUrl: completionSignatureUrl || (row.completion_signature_url ? String(row.completion_signature_url) : null),
        createdAt: toIsoDate(row.created_at) ?? new Date().toISOString(),
        updatedAt: toIsoDate(row.updated_at) ?? new Date().toISOString(),
      },
    };
  } catch (e: unknown) {
    console.error('[operations] getOperationsWorkOrderById failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאה',
    };
  }
}

export async function setOperationsWorkOrderStatus(params: {
  orgSlug: string;
  id: string;
  status: OperationsWorkOrderStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    const status = String(params.status || '').trim() as OperationsWorkOrderStatus;

    if (!id) {
      return { success: false, error: 'חסר מזהה קריאה' };
    }

    if (status !== 'NEW' && status !== 'IN_PROGRESS' && status !== 'DONE') {
      return { success: false, error: 'סטטוס לא חוקי' };
    }

    await prisma.operationsWorkOrder.updateMany({
      where: { id, organizationId: workspace.id },
      data: { status },
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] setOperationsWorkOrderStatus failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס קריאה',
    };
  }
}

export async function createOperationsProject(params: {
  orgSlug: string;
  title: string;
  canonicalClientId: string;
  installationAddress?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const title = String(params.title || '').trim();
    const canonicalClientId = String(params.canonicalClientId || '').trim();
    const installationAddress = String(params.installationAddress || '').trim();

    if (!title) {
      return { success: false, error: 'חובה להזין שם פרויקט' };
    }

    if (!canonicalClientId) {
      return { success: false, error: 'חובה לבחור לקוח' };
    }

    const created = await prisma.operationsProject.create({
      data: {
        organizationId: workspace.id,
        canonicalClientId,
        title,
        status: 'ACTIVE',
        installationAddress: installationAddress ? installationAddress : null,
        addressNormalized: installationAddress ? normalizeAddress(installationAddress) : null,
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: unknown) {
    console.error('[operations] createOperationsProject failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פרויקט',
    };
  }
}
