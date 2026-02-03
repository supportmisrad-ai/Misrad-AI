import 'server-only';

import { prisma } from '@/lib/services/operations/db';
import { getUnknownErrorMessage, toNumberSafe } from '@/lib/services/operations/shared';
import type { OperationsInventoryData, OperationsInventoryOption } from '@/lib/services/operations/types';

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
    console.error('[operations] getOperationsInventoryOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי' };
  }
}

export async function getOperationsInventoryDataForOrganizationId(params: {
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
    console.error('[operations] getOperationsInventoryData failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי' };
  }
}
