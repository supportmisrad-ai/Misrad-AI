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
import { getOperationsClientOptionsForOrganizationId } from '@/lib/services/operations/clients';
import type {
  OperationsClientOption,
  OperationsDashboardData,
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
} from '@/lib/services/operations/types';

export type { OperationsClientOption } from '@/lib/services/operations/types';

export type { OperationsDashboardData } from '@/lib/services/operations/types';

export type { OperationsProjectsData } from '@/lib/services/operations/types';

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
  projectId: string;
  title: string;
  description?: string;
  scheduledStart?: string;
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
