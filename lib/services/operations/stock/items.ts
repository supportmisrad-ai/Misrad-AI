import 'server-only';

import { orgExec, prisma } from '@/lib/services/operations/db';
import { getUnknownErrorMessage, logOperationsError } from '@/lib/services/operations/shared';
import { ensureOperationsPrimaryWarehouseHolderId } from '@/lib/services/operations/stock-holders';

export async function createOperationsItemForOrganizationId(params: {
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
      update: {
        organizationId: params.organizationId,
      },
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

export async function updateOperationsItemForOrganizationId(params: {
  organizationId: string;
  itemId: string;
  name?: string;
  sku?: string | null;
  unit?: string | null;
  minLevel?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const itemId = String(params.itemId || '').trim();
    if (!itemId) return { success: false, error: 'חסר מזהה פריט' };

    const item = await prisma.operationsItem.findFirst({
      where: { id: itemId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!item) return { success: false, error: 'פריט לא נמצא' };

    const data: Record<string, unknown> = {};
    if (params.name !== undefined) {
      const name = String(params.name || '').trim();
      if (!name) return { success: false, error: 'חובה להזין שם פריט' };
      data.name = name;
    }
    if (params.sku !== undefined) data.sku = params.sku ? String(params.sku).trim() : null;
    if (params.unit !== undefined) data.unit = params.unit ? String(params.unit).trim() : null;

    if (Object.keys(data).length > 0) {
      await prisma.operationsItem.update({ where: { id: itemId }, data });
    }

    if (params.minLevel !== undefined && Number.isFinite(params.minLevel)) {
      await prisma.operationsInventory.updateMany({
        where: { organizationId: params.organizationId, itemId },
        data: { minLevel: params.minLevel },
      });
    }

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] updateOperationsItem failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון פריט' };
  }
}

export async function deleteOperationsItemForOrganizationId(params: {
  organizationId: string;
  itemId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const itemId = String(params.itemId || '').trim();
    if (!itemId) return { success: false, error: 'חסר מזהה פריט' };

    const item = await prisma.operationsItem.findFirst({
      where: { id: itemId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!item) return { success: false, error: 'פריט לא נמצא' };

    await prisma.operationsInventory.deleteMany({
      where: { organizationId: params.organizationId, itemId },
    });

    await orgExec(
      prisma,
      params.organizationId,
      `DELETE FROM operations_stock_balances WHERE organization_id = $1::uuid AND item_id = $2::uuid`,
      [params.organizationId, itemId]
    );

    await prisma.operationsItem.delete({ where: { id: itemId } });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsItem failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת פריט' };
  }
}
