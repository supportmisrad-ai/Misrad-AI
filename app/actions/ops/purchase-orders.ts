'use server';

import { logger } from '@/lib/server/logger';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import {
  autoGeneratePurchaseOrderFromLowInventoryForOrganizationId,
  createOperationsPurchaseOrderForOrganizationId,
  deleteOperationsPurchaseOrderForOrganizationId,
  getOperationsPurchaseOrderByIdForOrganizationId,
  getOperationsPurchaseOrdersForOrganizationId,
  receiveOperationsPurchaseOrderItemsForOrganizationId,
  updateOperationsPurchaseOrderStatusForOrganizationId,
} from '@/lib/services/operations/purchase-orders';
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import type {
  OperationsPurchaseOrdersData,
  OperationsPurchaseOrderDetail,
  OperationsPurchaseOrderStatus,
} from '@/lib/services/operations/types';

export async function getOperationsPurchaseOrders(params: {
  orgSlug: string;
  status?: string;
}): Promise<{ success: boolean; data?: OperationsPurchaseOrdersData; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsPurchaseOrdersForOrganizationId({ organizationId, status: params.status }),
      { source: 'server_actions_operations', reason: 'getOperationsPurchaseOrders' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsPurchaseOrders failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הזמנות רכש' };
  }
}

export async function getOperationsPurchaseOrderById(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; data?: OperationsPurchaseOrderDetail; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsPurchaseOrderByIdForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'getOperationsPurchaseOrderById' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsPurchaseOrderById failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הזמנת רכש' };
  }
}

export async function createOperationsPurchaseOrder(params: {
  orgSlug: string;
  supplierId?: string | null;
  notes?: string | null;
  expectedDelivery?: string | null;
  createdBy?: string | null;
  lineItems: Array<{
    itemId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsPurchaseOrderForOrganizationId({
          organizationId,
          supplierId: params.supplierId,
          notes: params.notes,
          expectedDelivery: params.expectedDelivery,
          createdBy: params.createdBy,
          lineItems: params.lineItems,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsPurchaseOrder' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsPurchaseOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת הזמנת רכש' };
  }
}

export async function updateOperationsPurchaseOrderStatus(params: {
  orgSlug: string;
  id: string;
  status: OperationsPurchaseOrderStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await updateOperationsPurchaseOrderStatusForOrganizationId({
          organizationId,
          id: params.id,
          status: params.status,
        }),
      { source: 'server_actions_operations', reason: 'updateOperationsPurchaseOrderStatus' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'updateOperationsPurchaseOrderStatus failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס הזמנה' };
  }
}

export async function receiveOperationsPurchaseOrderItems(params: {
  orgSlug: string;
  purchaseOrderId: string;
  receivedItems: Array<{ lineItemId: string; receivedQty: number }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await receiveOperationsPurchaseOrderItemsForOrganizationId({
          organizationId,
          purchaseOrderId: params.purchaseOrderId,
          receivedItems: params.receivedItems,
        }),
      { source: 'server_actions_operations', reason: 'receiveOperationsPurchaseOrderItems' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'receiveOperationsPurchaseOrderItems failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בקליטת פריטים' };
  }
}

export async function deleteOperationsPurchaseOrder(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await deleteOperationsPurchaseOrderForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'deleteOperationsPurchaseOrder' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsPurchaseOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת הזמנת רכש' };
  }
}

export async function autoGeneratePurchaseOrderFromLowInventory(params: {
  orgSlug: string;
  createdBy?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string; skipped?: boolean }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await autoGeneratePurchaseOrderFromLowInventoryForOrganizationId({
          organizationId,
          createdBy: params.createdBy,
        }),
      { source: 'server_actions_operations', reason: 'autoGeneratePurchaseOrderFromLowInventory' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'autoGeneratePurchaseOrderFromLowInventory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת הזמנה אוטומטית' };
  }
}
