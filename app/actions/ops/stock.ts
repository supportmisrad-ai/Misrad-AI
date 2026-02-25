'use server';

import { logger } from '@/lib/server/logger';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { insertMisradNotificationsForOrganizationId } from '@/lib/services/system/notifications';
import {
  addOperationsStockToActiveVehicleForOrganizationId,
  consumeOperationsInventoryForWorkOrderForOrganizationId,
  createOperationsItemForOrganizationId,
  updateOperationsItemForOrganizationId,
  deleteOperationsItemForOrganizationId,
  getOperationsInventoryDataForOrganizationId,
  getOperationsInventoryOptionsForHolderForOrganizationId,
  getOperationsInventoryOptionsForOrganizationId,
  getOperationsMaterialsForWorkOrderForOrganizationId,
  getOperationsStockSourceOptionsAutoForOrganizationId,
  getOperationsVehicleStockBalancesForOrganizationId,
  setOperationsWorkOrderStockSourceForOrganizationId,
  setOperationsWorkOrderStockSourceToMyActiveVehicleAutoForOrganizationId,
  transferOperationsStockToVehicleForOrganizationId,
} from '@/lib/services/operations/stock';
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import type {
  OperationsStockSourceOption,
  OperationsHolderStockRow,
  OperationsInventoryData,
  OperationsInventoryOption,
} from '@/lib/services/operations/types';

export async function getOperationsStockSourceOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsStockSourceOption[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsStockSourceOptionsAutoForOrganizationId({ organizationId, orgSlug: params.orgSlug }),
      { source: 'server_actions_operations', reason: 'getOperationsStockSourceOptions' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsStockSourceOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מקורות מלאי' };
  }
}

export async function setOperationsWorkOrderStockSource(params: {
  orgSlug: string;
  workOrderId: string;
  holderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await setOperationsWorkOrderStockSourceForOrganizationId({
          organizationId,
          workOrderId: params.workOrderId,
          holderId: params.holderId,
        }),
      { source: 'server_actions_operations', reason: 'setOperationsWorkOrderStockSource' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'setOperationsWorkOrderStockSource failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת מקור מלאי' };
  }
}

export async function setOperationsWorkOrderStockSourceToMyActiveVehicle(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await setOperationsWorkOrderStockSourceToMyActiveVehicleAutoForOrganizationId({
          organizationId,
          orgSlug: params.orgSlug,
          workOrderId: params.workOrderId,
        }),
      { source: 'server_actions_operations', reason: 'setOperationsWorkOrderStockSourceToMyActiveVehicle' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'setOperationsWorkOrderStockSourceToMyActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקביעת מקור מלאי לרכב הפעיל' };
  }
}

export async function getOperationsVehicleStockBalances(params: {
  orgSlug: string;
  vehicleId: string;
}): Promise<{ success: boolean; data?: OperationsHolderStockRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsVehicleStockBalancesForOrganizationId({
          organizationId,
          vehicleId: params.vehicleId,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsVehicleStockBalances' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsVehicleStockBalances failed', e);
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await transferOperationsStockToVehicleForOrganizationId({
          organizationId,
          vehicleId: params.vehicleId,
          itemId: params.itemId,
          qty: params.qty,
        }),
      { source: 'server_actions_operations', reason: 'transferOperationsStockToVehicle' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'transferOperationsStockToVehicle failed', e);
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await addOperationsStockToActiveVehicleForOrganizationId({
          organizationId,
          technicianId: params.technicianId,
          itemId: params.itemId,
          qty: params.qty,
        }),
      { source: 'server_actions_operations', reason: 'addOperationsStockToActiveVehicle' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'addOperationsStockToActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקליטת מלאי לרכב' };
  }
}

export async function getOperationsInventoryData(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsInventoryData; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsInventoryDataForOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsInventoryData' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsInventoryData failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי' };
  }
}

export async function getOperationsInventoryOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsInventoryOption[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsInventoryOptionsForOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsInventoryOptions' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsInventoryOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי' };
  }
}

export async function getOperationsInventoryOptionsForHolder(params: {
  orgSlug: string;
  holderId: string;
}): Promise<{ success: boolean; data?: OperationsInventoryOption[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsInventoryOptionsForHolderForOrganizationId({
          organizationId,
          holderId: params.holderId,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsInventoryOptionsForHolder' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsInventoryOptionsForHolder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מלאי לפי מקור' };
  }
}

export async function consumeOperationsInventoryForWorkOrder(params: {
  orgSlug: string;
  workOrderId: string;
  inventoryId: string;
  qty: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await consumeOperationsInventoryForWorkOrderForOrganizationId({
          organizationId,
          workOrderId: params.workOrderId,
          inventoryId: params.inventoryId,
          qty: params.qty,
        }),
      { source: 'server_actions_operations', reason: 'consumeOperationsInventoryForWorkOrder' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'consumeOperationsInventoryForWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בהורדת מלאי' };
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsMaterialsForWorkOrderForOrganizationId({
          organizationId,
          workOrderId: params.workOrderId,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsMaterialsForWorkOrder' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsMaterialsForWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת חומרים לקריאה' };
  }
}

export async function createOperationsItem(params: {
  orgSlug: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
}): Promise<{ success: boolean; data?: { itemId: string }; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsItemForOrganizationId({
          organizationId,
          name: params.name,
          sku: params.sku,
          unit: params.unit,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsItem' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsItem failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פריט' };
  }
}

export async function updateOperationsItem(params: {
  orgSlug: string;
  itemId: string;
  name?: string;
  sku?: string | null;
  unit?: string | null;
  minLevel?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await updateOperationsItemForOrganizationId({
          organizationId,
          itemId: params.itemId,
          name: params.name,
          sku: params.sku,
          unit: params.unit,
          minLevel: params.minLevel,
        }),
      { source: 'server_actions_operations', reason: 'updateOperationsItem' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'updateOperationsItem failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון פריט' };
  }
}

export async function deleteOperationsItem(params: {
  orgSlug: string;
  itemId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await deleteOperationsItemForOrganizationId({
          organizationId,
          itemId: params.itemId,
        }),
      { source: 'server_actions_operations', reason: 'deleteOperationsItem' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsItem failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת פריט' };
  }
}

export async function checkAndNotifyLowInventory(params: {
  orgSlug: string;
}): Promise<{ success: boolean; lowCount?: number; criticalCount?: number; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => {
        const { prisma: db } = await import('@/lib/services/operations/db');
        const items = await db.operationsInventory.findMany({
          where: { organizationId },
          select: { onHand: true, minLevel: true, item: { select: { name: true } } },
        });

        let lowCount = 0;
        let criticalCount = 0;
        const criticalNames: string[] = [];

        for (const row of items) {
          const onHand = Number(row.onHand ?? 0);
          const minLevel = Number(row.minLevel ?? 0);
          if (onHand <= 0) {
            criticalCount++;
            if (row.item?.name) criticalNames.push(String(row.item.name));
          } else if (minLevel > 0 && onHand < minLevel) {
            lowCount++;
          }
        }

        if (criticalCount > 0 || lowCount > 0) {
          try {
            const adminUsers = await db.$queryRawUnsafe<Array<{ clerk_user_id: string }>>(
              `SELECT clerk_user_id FROM organization_users WHERE organization_id = $1::uuid AND role IN ('admin','ceo','owner','super_admin','ADMIN','CEO','OWNER','SUPER_ADMIN')`,
              organizationId,
            );
            const recipientIds = adminUsers.map((u) => String(u.clerk_user_id)).filter(Boolean);
            if (recipientIds.length > 0) {
              const text = criticalCount > 0
                ? `התראת מלאי: ${criticalCount} פריטים קריטיים (אזלו)${criticalNames.length > 0 ? ` — ${criticalNames.slice(0, 3).join(', ')}` : ''}${lowCount > 0 ? `, ${lowCount} נמוכים` : ''}`
                : `התראת מלאי: ${lowCount} פריטים מתחת לכמות מינימום`;
              insertMisradNotificationsForOrganizationId({
                organizationId,
                recipientIds,
                type: 'INVENTORY_ALERT',
                text,
                reason: 'ops_inventory_low_stock_alert',
              }).catch(() => null);
            }
          } catch {
            // notification is non-critical
          }
        }

        return { success: true, lowCount, criticalCount };
      },
      { source: 'server_actions_operations', reason: 'checkAndNotifyLowInventory' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'checkAndNotifyLowInventory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בבדיקת מלאי' };
  }
}

export async function importInventoryFromCsv(params: {
  orgSlug: string;
  rows: Array<{ name: string; sku?: string; unit?: string; minLevel?: number; onHand?: number }>;
}): Promise<{ success: boolean; imported?: number; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => {
        const { prisma: db } = await import('@/lib/services/operations/db');
        let imported = 0;
        for (const row of params.rows) {
          const name = String(row.name || '').trim();
          if (!name) continue;

          const item = await db.operationsItem.create({
            data: {
              organizationId,
              name,
              sku: row.sku ? String(row.sku).trim() : null,
              unit: row.unit ? String(row.unit).trim() : null,
            },
          });

          await db.operationsInventory.create({
            data: {
              organizationId,
              itemId: item.id,
              onHand: Number(row.onHand) || 0,
              minLevel: Number(row.minLevel) || 0,
            },
          });

          imported++;
        }
        return { success: true, imported };
      },
      { source: 'server_actions_operations', reason: 'importInventoryFromCsv' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'importInventoryFromCsv failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בייבוא מלאי' };
  }
}

export async function getAiMaterialSuggestions(params: {
  orgSlug: string;
  categoryId?: string | null;
  title?: string;
}): Promise<{ success: boolean; suggestions?: Array<{ itemName: string; avgQty: number; usageCount: number }>; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => {
        const { prisma: db, orgQuery } = await import('@/lib/services/operations/db');
        const { asObject } = await import('@/lib/services/operations/shared');

        const values: unknown[] = [organizationId];
        let categoryFilter = '';
        if (params.categoryId) {
          values.push(params.categoryId);
          categoryFilter = `AND wo.category_id = $${values.length}::uuid`;
        }

        const rows = await orgQuery<unknown[]>(
          db,
          organizationId,
          `
            SELECT
              oi.name AS item_name,
              ROUND(AVG(wom.quantity)::numeric, 2) AS avg_qty,
              COUNT(*)::int AS usage_count
            FROM operations_work_order_materials wom
            JOIN operations_inventory inv ON inv.id = wom.inventory_id
            JOIN operations_items oi ON oi.id = inv.item_id
            JOIN operations_work_orders wo ON wo.id = wom.work_order_id
            WHERE wo.organization_id = $1::uuid
              AND wo.status = 'DONE'
              ${categoryFilter}
            GROUP BY oi.name
            ORDER BY usage_count DESC
            LIMIT 5
          `,
          values,
        );

        const suggestions = (rows || []).map((r) => {
          const obj = asObject(r) ?? {};
          return {
            itemName: String(obj.item_name ?? ''),
            avgQty: Number(obj.avg_qty ?? 0),
            usageCount: Number(obj.usage_count ?? 0),
          };
        });

        return { success: true, suggestions };
      },
      { source: 'server_actions_operations', reason: 'getAiMaterialSuggestions' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getAiMaterialSuggestions failed', e);
    return { success: true, suggestions: [] };
  }
}
