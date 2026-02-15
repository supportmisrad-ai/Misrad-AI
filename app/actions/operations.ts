'use server';


import { logger } from '@/lib/server/logger';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
 

import {
  createOperationsVehicleForOrganizationId,
  deleteOperationsVehicleForOrganizationId,
  getOperationsTechnicianActiveVehicleByOrganizationId,
  getOperationsVehiclesByOrganizationId,
} from '@/lib/services/operations/vehicles';
import {
  createOperationsLocationForOrganizationId,
  deleteOperationsLocationForOrganizationId,
  getOperationsLocationsByOrganizationId,
} from '@/lib/services/operations/locations';
import {
  createOperationsProjectForOrganizationId,
  getOperationsProjectOptionsForOrganizationId,
  getOperationsProjectsDataForOrganizationId,
} from '@/lib/services/operations/projects';
import { getOperationsDashboardDataForOrganizationId } from '@/lib/services/operations/dashboard';
import {
  createOperationsWorkOrderTypeForOrganizationId,
  deleteOperationsWorkOrderTypeForOrganizationId,
  getOperationsWorkOrderTypesByOrganizationId,
} from '@/lib/services/operations/work-order-types';
import {
  createOperationsBuildingForOrganizationId,
  deleteOperationsBuildingForOrganizationId,
  getOperationsBuildingsByOrganizationId,
  updateOperationsBuildingForOrganizationId,
} from '@/lib/services/operations/buildings';
import {
  createOperationsCallCategoryForOrganizationId,
  deleteOperationsCallCategoryForOrganizationId,
  getOperationsCallCategoriesByOrganizationId,
  updateOperationsCallCategoryForOrganizationId,
} from '@/lib/services/operations/categories';
import {
  createOperationsDepartmentForOrganizationId,
  deleteOperationsDepartmentForOrganizationId,
  getOperationsDepartmentsByOrganizationId,
} from '@/lib/services/operations/departments';
import {
  createOperationsCallMessageForOrganizationId,
  deleteOperationsCallMessageForOrganizationId,
  getOperationsCallMessagesByWorkOrderId,
  updateOperationsCallMessageForOrganizationId,
} from '@/lib/services/operations/call-messages';
import {
  addOperationsWorkOrderAttachmentForOrganizationId,
  addOperationsWorkOrderCheckinForOrganizationId,
  createOperationsWorkOrderForOrganizationId,
  getOperationsWorkOrderAttachmentsForOrganizationId,
  getOperationsWorkOrderByIdForOrganizationId,
  getOperationsWorkOrderCheckinsForOrganizationId,
  getOperationsWorkOrdersDataForOrganizationId,
  setOperationsWorkOrderAssignedTechnicianForOrganizationId,
  setOperationsWorkOrderCompletionSignatureForOrganizationId,
  setOperationsWorkOrderStatusForOrganizationId,
} from '@/lib/services/operations/work-orders';
import {
  addOperationsStockToActiveVehicleForOrganizationId,
  consumeOperationsInventoryForWorkOrderForOrganizationId,
  createOperationsItemForOrganizationId,
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
import {
  getUnknownErrorMessage,
} from '@/lib/services/operations/shared';
import {
  contractorAddWorkOrderAttachment as contractorAddWorkOrderAttachmentService,
  contractorAddWorkOrderCheckin as contractorAddWorkOrderCheckinService,
  contractorGetWorkOrderAttachments as contractorGetWorkOrderAttachmentsService,
  contractorGetWorkOrderCheckins as contractorGetWorkOrderCheckinsService,
  contractorMarkWorkOrderDoneByToken,
  contractorResolveTokenForApi as contractorResolveTokenForApiService,
  contractorSetWorkOrderCompletionSignatureByToken,
  contractorValidateWorkOrderAccess as contractorValidateWorkOrderAccessService,
  createOperationsContractorTokenForOrganizationId,
  getOperationsContractorPortalDataByToken,
} from '@/lib/services/operations/contractors';
import {
  getOperationsTechnicianOptionsForOrganizationId,
  setOperationsTechnicianActiveVehicleForOrganizationId,
} from '@/lib/services/operations/technicians';
import {
  createOperationsSupplierForOrganizationId,
  deleteOperationsSupplierForOrganizationId,
  getOperationsSuppliersByOrganizationId,
} from '@/lib/services/operations/suppliers';
import { getOperationsClientOptionsForOrganizationId } from '@/lib/services/operations/clients';
import type {
  OperationsBuildingRow,
  OperationsCallCategoryRow,
  OperationsCallMessageRow,
  OperationsClientOption,
  OperationsDashboardData,
  OperationsDepartmentRow,
  OperationsHolderStockRow,
  OperationsInventoryData,
  OperationsInventoryOption,
  OperationsLocationRow,
  OperationsProjectOption,
  OperationsProjectsData,
  OperationsStockSourceOption,
  OperationsTechnicianOption,
  OperationsVehicleRow,
  OperationsWorkOrderAttachmentRow,
  OperationsWorkOrderCheckinRow,
  OperationsWorkOrderRow,
  OperationsWorkOrdersData,
  OperationsWorkOrderStatus,
  OperationsWorkOrderTypeRow,
  OperationsSupplierRow,
} from '@/lib/services/operations/types';

export type { OperationsClientOption } from '@/lib/services/operations/types';

export type { OperationsDashboardData } from '@/lib/services/operations/types';

export type { OperationsProjectsData } from '@/lib/services/operations/types';

export type { OperationsSupplierRow } from '@/lib/services/operations/types';

export type { OperationsInventoryData } from '@/lib/services/operations/types';

export type { OperationsProjectOption } from '@/lib/services/operations/types';

export type { OperationsWorkOrderStatus } from '@/lib/services/operations/types';

export type { OperationsWorkOrderRow } from '@/lib/services/operations/types';

export type { OperationsTechnicianOption } from '@/lib/services/operations/types';

export type { OperationsVehicleRow } from '@/lib/services/operations/types';

export async function getOperationsVehicles(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsVehicleRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsVehiclesByOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsVehicles' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsVehicles failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רכבים' };
  }
}

export async function createOperationsVehicle(params: {
  orgSlug: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await createOperationsVehicleForOrganizationId({ organizationId, name: params.name }),
      { source: 'server_actions_operations', reason: 'createOperationsVehicle' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsVehicle failed', e);
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

export async function deleteOperationsVehicle(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await deleteOperationsVehicleForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'deleteOperationsVehicle' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת רכב' };
  }
}

export async function setOperationsTechnicianActiveVehicle(params: {
  orgSlug: string;
  technicianId: string;
  vehicleId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await setOperationsTechnicianActiveVehicleForOrganizationId({
          organizationId,
          technicianId: params.technicianId,
          vehicleId: params.vehicleId,
        }),
      { source: 'server_actions_operations', reason: 'setOperationsTechnicianActiveVehicle' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'setOperationsTechnicianActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת רכב פעיל' };
  }
}

export type { OperationsStockSourceOption } from '@/lib/services/operations/types';

export type { OperationsHolderStockRow } from '@/lib/services/operations/types';

export async function getOperationsTechnicianActiveVehicle(params: {
  orgSlug: string;
  technicianId: string;
}): Promise<{ success: boolean; data?: { vehicleId: string | null; vehicleName: string | null }; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsTechnicianActiveVehicleByOrganizationId({
          organizationId,
          technicianId: params.technicianId,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsTechnicianActiveVehicle' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsTechnicianActiveVehicle failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רכב פעיל' };
  }
}

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

export type { OperationsWorkOrdersData } from '@/lib/services/operations/types';

export type { OperationsInventoryOption } from '@/lib/services/operations/types';

export type { OperationsWorkOrderAttachmentRow } from '@/lib/services/operations/types';

export type { OperationsWorkOrderCheckinRow } from '@/lib/services/operations/types';

export type { OperationsLocationRow } from '@/lib/services/operations/types';

export type { OperationsWorkOrderTypeRow } from '@/lib/services/operations/types';

export type { OperationsBuildingRow } from '@/lib/services/operations/types';
export type { OperationsCallCategoryRow } from '@/lib/services/operations/types';
export type { OperationsDepartmentRow } from '@/lib/services/operations/types';
export type { OperationsCallMessageRow } from '@/lib/services/operations/types';
export type { OperationsWorkOrderPriority } from '@/lib/services/operations/types';


export async function getOperationsClientOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsClientOption[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsClientOptionsForOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsClientOptions' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsClientOptions failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הלקוחות',
    };
  }
}

export async function setOperationsWorkOrderCompletionSignature(params: {
  orgSlug: string;
  id: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await setOperationsWorkOrderCompletionSignatureForOrganizationId({
          organizationId,
          id: params.id,
          signatureUrl: params.signatureUrl,
        }),
      { source: 'server_actions_operations', reason: 'setOperationsWorkOrderCompletionSignature' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'setOperationsWorkOrderCompletionSignature failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת חתימה' };
  }
}

export async function contractorSetWorkOrderCompletionSignature(params: {
  token: string;
  workOrderId: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await contractorSetWorkOrderCompletionSignatureByToken({
      token: params.token,
      workOrderId: params.workOrderId,
      signatureUrl: params.signatureUrl,
    });
  } catch (e: unknown) {
    logger.error('operations', 'contractorSetWorkOrderCompletionSignature failed', e);
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await addOperationsWorkOrderAttachmentForOrganizationId({
          organizationId,
          workOrderId: params.workOrderId,
          storageBucket: params.storageBucket,
          storagePath: params.storagePath,
          url: params.url,
          mimeType: params.mimeType,
          createdByType: params.createdByType,
          createdByRef: params.createdByRef,
        }),
      { source: 'server_actions_operations', reason: 'addOperationsWorkOrderAttachment' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'addOperationsWorkOrderAttachment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת קובץ לקריאה' };
  }
}

export async function getOperationsLocations(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsLocationRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsLocationsByOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsLocations' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsLocations failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מחסנים' };
  }
}

export async function createOperationsLocation(params: {
  orgSlug: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await createOperationsLocationForOrganizationId({ organizationId, name: params.name }),
      { source: 'server_actions_operations', reason: 'createOperationsLocation' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsLocation failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת מחסן' };
  }
}

export async function deleteOperationsLocation(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await deleteOperationsLocationForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'deleteOperationsLocation' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsLocation failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת מחסן' };
  }
}

export async function getOperationsWorkOrderTypes(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderTypeRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsWorkOrderTypesByOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsWorkOrderTypes' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsWorkOrderTypes failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת סוגי קריאות' };
  }
}

export async function createOperationsWorkOrderType(params: {
  orgSlug: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await createOperationsWorkOrderTypeForOrganizationId({ organizationId, name: params.name }),
      { source: 'server_actions_operations', reason: 'createOperationsWorkOrderType' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsWorkOrderType failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת סוג קריאה' };
  }
}

export async function deleteOperationsWorkOrderType(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await deleteOperationsWorkOrderTypeForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'deleteOperationsWorkOrderType' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsWorkOrderType failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת סוג קריאה' };
  }
}

export async function getOperationsTechnicianOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsTechnicianOption[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsTechnicianOptionsForOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsTechnicianOptions' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsTechnicianOptions failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הטכנאים' };
  }
}

export async function setOperationsWorkOrderAssignedTechnician(params: {
  orgSlug: string;
  id: string;
  technicianId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await setOperationsWorkOrderAssignedTechnicianForOrganizationId({
          organizationId,
          id: params.id,
          technicianId: params.technicianId,
        }),
      { source: 'server_actions_operations', reason: 'setOperationsWorkOrderAssignedTechnician' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'setOperationsWorkOrderAssignedTechnician failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשיוך טכנאי לקריאה' };
  }
}

export async function getOperationsWorkOrderAttachments(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderAttachmentRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsWorkOrderAttachmentsForOrganizationId({
          organizationId,
          orgSlug: params.orgSlug,
          workOrderId: params.workOrderId,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsWorkOrderAttachments' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsWorkOrderAttachments failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת קבצים לקריאה' };
  }
}

export async function getOperationsWorkOrderCheckins(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderCheckinRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsWorkOrderCheckinsForOrganizationId({
          organizationId,
          workOrderId: params.workOrderId,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsWorkOrderCheckins' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsWorkOrderCheckins failed', e);
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await addOperationsWorkOrderCheckinForOrganizationId({
          organizationId,
          workOrderId: params.workOrderId,
          lat: params.lat,
          lng: params.lng,
          accuracy: params.accuracy,
          createdByType: params.createdByType,
          createdByRef: params.createdByRef,
        }),
      { source: 'server_actions_operations', reason: 'addOperationsWorkOrderCheckin' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'addOperationsWorkOrderCheckin failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת Check-In' };
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
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי',
    };
  }
}

export async function contractorResolveTokenForApi(params: {
  token: string;
}): Promise<{ success: boolean; organizationId?: string; tokenHash?: string; error?: string }> {
  return await contractorResolveTokenForApiService({ token: params.token });
}

export async function contractorValidateWorkOrderAccess(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  return await contractorValidateWorkOrderAccessService({ token: params.token, workOrderId: params.workOrderId });
}

export async function contractorGetWorkOrderAttachments(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderAttachmentRow[]; error?: string }> {
  return await contractorGetWorkOrderAttachmentsService({ token: params.token, workOrderId: params.workOrderId });
}

export async function contractorAddWorkOrderAttachment(params: {
  token: string;
  workOrderId: string;
  storageBucket?: string;
  storagePath: string;
  url: string;
  mimeType?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  return await contractorAddWorkOrderAttachmentService({
    token: params.token,
    workOrderId: params.workOrderId,
    storageBucket: params.storageBucket,
    storagePath: params.storagePath,
    url: params.url,
    mimeType: params.mimeType,
  });
}

export async function contractorGetWorkOrderCheckins(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderCheckinRow[]; error?: string }> {
  return await contractorGetWorkOrderCheckinsService({ token: params.token, workOrderId: params.workOrderId });
}

export async function contractorAddWorkOrderCheckin(params: {
  token: string;
  workOrderId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  return await contractorAddWorkOrderCheckinService({
    token: params.token,
    workOrderId: params.workOrderId,
    lat: params.lat,
    lng: params.lng,
    accuracy: params.accuracy,
  });
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
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת חומרים לקריאה',
    };
  }
}

export async function createOperationsContractorToken(params: {
  orgSlug: string;
  contractorLabel?: string;
  ttlHours?: number;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsContractorTokenForOrganizationId({
          organizationId,
          contractorLabel: params.contractorLabel,
          ttlHours: params.ttlHours,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsContractorToken' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsContractorToken failed', e);
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
    return await getOperationsContractorPortalDataByToken({ token: params.token });
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsContractorPortalData failed', e);
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
    return await contractorMarkWorkOrderDoneByToken({
      token: params.token,
      workOrderId: params.workOrderId,
    });
  } catch (e: unknown) {
    logger.error('operations', 'contractorMarkWorkOrderDone failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס',
    };
  }
}

export async function getOperationsDashboardData(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsDashboardData; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsDashboardDataForOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsDashboardData' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsDashboardData failed', e);
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsProjectsDataForOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsProjectsData' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsProjectsData failed', e);
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

export async function getOperationsProjectOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsProjectOption[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsProjectOptionsForOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsProjectOptions' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsProjectOptions failed', e);
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsWorkOrdersDataForOrganizationId({
          organizationId,
          status: params.status,
          projectId: params.projectId,
          assignedTechnicianId: params.assignedTechnicianId,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsWorkOrdersData' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsWorkOrdersData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאות',
    };
  }
}

export async function createOperationsWorkOrder(params: {
  orgSlug: string;
  projectId?: string | null;
  title: string;
  description?: string;
  scheduledStart?: string;
  priority?: string;
  categoryId?: string | null;
  departmentId?: string | null;
  buildingId?: string | null;
  floor?: string | null;
  unit?: string | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  assignedTechnicianId?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsWorkOrderForOrganizationId({
          organizationId,
          projectId: params.projectId,
          title: params.title,
          description: params.description,
          scheduledStart: params.scheduledStart,
          priority: params.priority,
          categoryId: params.categoryId,
          departmentId: params.departmentId,
          buildingId: params.buildingId,
          floor: params.floor,
          unit: params.unit,
          reporterName: params.reporterName,
          reporterPhone: params.reporterPhone,
          assignedTechnicianId: params.assignedTechnicianId,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsWorkOrder' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsWorkOrder failed', e);
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
    priority: string;
    scheduledStart: string | null;
    installationAddress: string | null;
    project: { id: string; title: string } | null;
    assignedTechnicianId: string | null;
    technicianLabel: string | null;
    stockSourceHolderId: string | null;
    stockSourceLabel: string | null;
    completionSignatureUrl: string | null;
    categoryId: string | null;
    categoryName: string | null;
    departmentId: string | null;
    departmentName: string | null;
    buildingId: string | null;
    buildingName: string | null;
    floor: string | null;
    unit: string | null;
    reporterName: string | null;
    reporterPhone: string | null;
    slaDeadline: string | null;
    completedAt: string | null;
    aiSummary: string | null;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsWorkOrderByIdForOrganizationId({
          organizationId,
          orgSlug: params.orgSlug,
          id: params.id,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsWorkOrderById' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsWorkOrderById failed', e);
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await setOperationsWorkOrderStatusForOrganizationId({
          organizationId,
          id: params.id,
          status: params.status,
        }),
      { source: 'server_actions_operations', reason: 'setOperationsWorkOrderStatus' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'setOperationsWorkOrderStatus failed', e);
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
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsProjectForOrganizationId({
          organizationId,
          title: params.title,
          canonicalClientId: params.canonicalClientId,
          installationAddress: params.installationAddress,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsProject' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsProject failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פרויקט',
    };
  }
}

// ──── Buildings ────

export async function getOperationsBuildings(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsBuildingRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsBuildingsByOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsBuildings' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsBuildings failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מבנים' };
  }
}

export async function createOperationsBuilding(params: {
  orgSlug: string;
  name: string;
  address?: string | null;
  floors?: number | null;
  notes?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsBuildingForOrganizationId({
          organizationId,
          name: params.name,
          address: params.address,
          floors: params.floors,
          notes: params.notes,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsBuilding' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsBuilding failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת מבנה' };
  }
}

export async function updateOperationsBuilding(params: {
  orgSlug: string;
  id: string;
  name?: string;
  address?: string | null;
  floors?: number | null;
  notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await updateOperationsBuildingForOrganizationId({
          organizationId,
          id: params.id,
          name: params.name,
          address: params.address,
          floors: params.floors,
          notes: params.notes,
        }),
      { source: 'server_actions_operations', reason: 'updateOperationsBuilding' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'updateOperationsBuilding failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון מבנה' };
  }
}

export async function deleteOperationsBuilding(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await deleteOperationsBuildingForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'deleteOperationsBuilding' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsBuilding failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת מבנה' };
  }
}

// ──── Call Categories ────

export async function getOperationsCallCategories(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsCallCategoryRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsCallCategoriesByOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsCallCategories' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsCallCategories failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת קטגוריות' };
  }
}

export async function createOperationsCallCategory(params: {
  orgSlug: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  maxResponseMinutes?: number | null;
  sortOrder?: number;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsCallCategoryForOrganizationId({
          organizationId,
          name: params.name,
          color: params.color,
          icon: params.icon,
          maxResponseMinutes: params.maxResponseMinutes,
          sortOrder: params.sortOrder,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsCallCategory' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsCallCategory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת קטגוריה' };
  }
}

export async function updateOperationsCallCategory(params: {
  orgSlug: string;
  id: string;
  name?: string;
  color?: string | null;
  icon?: string | null;
  maxResponseMinutes?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await updateOperationsCallCategoryForOrganizationId({
          organizationId,
          id: params.id,
          name: params.name,
          color: params.color,
          icon: params.icon,
          maxResponseMinutes: params.maxResponseMinutes,
          sortOrder: params.sortOrder,
          isActive: params.isActive,
        }),
      { source: 'server_actions_operations', reason: 'updateOperationsCallCategory' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'updateOperationsCallCategory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון קטגוריה' };
  }
}

export async function deleteOperationsCallCategory(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await deleteOperationsCallCategoryForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'deleteOperationsCallCategory' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsCallCategory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת קטגוריה' };
  }
}

// ──── Departments ────

export async function getOperationsDepartments(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsDepartmentRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsDepartmentsByOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsDepartments' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsDepartments failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מחלקות' };
  }
}

export async function createOperationsDepartment(params: {
  orgSlug: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsDepartmentForOrganizationId({
          organizationId,
          name: params.name,
          icon: params.icon,
          color: params.color,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsDepartment' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsDepartment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת מחלקה' };
  }
}

export async function deleteOperationsDepartment(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await deleteOperationsDepartmentForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'deleteOperationsDepartment' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsDepartment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת מחלקה' };
  }
}

// ──── Call Messages ────

export async function getOperationsCallMessages(params: {
  orgSlug: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsCallMessageRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsCallMessagesByWorkOrderId({ organizationId, workOrderId: params.workOrderId }),
      { source: 'server_actions_operations', reason: 'getOperationsCallMessages' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsCallMessages failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הודעות' };
  }
}

export async function createOperationsCallMessage(params: {
  orgSlug: string;
  workOrderId: string;
  authorId: string;
  authorName: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  mentions?: string[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsCallMessageForOrganizationId({
          organizationId,
          workOrderId: params.workOrderId,
          authorId: params.authorId,
          authorName: params.authorName,
          content: params.content,
          attachmentUrl: params.attachmentUrl,
          attachmentType: params.attachmentType,
          mentions: params.mentions,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsCallMessage' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsCallMessage failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשליחת הודעה' };
  }
}

export async function updateOperationsCallMessage(params: {
  orgSlug: string;
  messageId: string;
  authorId: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await updateOperationsCallMessageForOrganizationId({
          organizationId,
          messageId: params.messageId,
          authorId: params.authorId,
          content: params.content,
        }),
      { source: 'server_actions_operations', reason: 'updateOperationsCallMessage' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'updateOperationsCallMessage failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון הודעה' };
  }
}

export async function deleteOperationsCallMessage(params: {
  orgSlug: string;
  messageId: string;
  authorId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await deleteOperationsCallMessageForOrganizationId({
          organizationId,
          messageId: params.messageId,
          authorId: params.authorId,
        }),
      { source: 'server_actions_operations', reason: 'deleteOperationsCallMessage' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsCallMessage failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת הודעה' };
  }
}

// ──── Suppliers ────

export async function getOperationsSuppliers(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsSupplierRow[]; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await getOperationsSuppliersByOrganizationId({ organizationId }),
      { source: 'server_actions_operations', reason: 'getOperationsSuppliers' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsSuppliers failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת ספקים' };
  }
}

export async function createOperationsSupplier(params: {
  orgSlug: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await createOperationsSupplierForOrganizationId({
          organizationId,
          name: params.name,
          contactName: params.contactName,
          phone: params.phone,
          email: params.email,
          notes: params.notes,
        }),
      { source: 'server_actions_operations', reason: 'createOperationsSupplier' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsSupplier failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת ספק' };
  }
}

export async function deleteOperationsSupplier(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => await deleteOperationsSupplierForOrganizationId({ organizationId, id: params.id }),
      { source: 'server_actions_operations', reason: 'deleteOperationsSupplier' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'deleteOperationsSupplier failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת ספק' };
  }
}
