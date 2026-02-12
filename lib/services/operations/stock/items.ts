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
