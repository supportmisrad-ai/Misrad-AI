'use server';

import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
 

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
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await getOperationsVehiclesByOrganizationId({ organizationId: workspace.id });
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
    return await createOperationsVehicleForOrganizationId({ organizationId: workspace.id, name: params.name });
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
    return await createOperationsItemForOrganizationId({
      organizationId: workspace.id,
      name: params.name,
      sku: params.sku,
      unit: params.unit,
    });
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
    return await deleteOperationsVehicleForOrganizationId({ organizationId: workspace.id, id: params.id });
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
    return await setOperationsTechnicianActiveVehicleForOrganizationId({
      organizationId: workspace.id,
      technicianId: params.technicianId,
      vehicleId: params.vehicleId,
    });
  } catch (e: unknown) {
    console.error('[operations] setOperationsTechnicianActiveVehicle failed', e);
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
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await getOperationsTechnicianActiveVehicleByOrganizationId({
      organizationId: workspace.id,
      technicianId: params.technicianId,
    });
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
    return await getOperationsStockSourceOptionsAutoForOrganizationId({ organizationId: workspace.id, orgSlug: params.orgSlug });
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
    return await setOperationsWorkOrderStockSourceForOrganizationId({
      organizationId: workspace.id,
      workOrderId: params.workOrderId,
      holderId: params.holderId,
    });
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
    return await setOperationsWorkOrderStockSourceToMyActiveVehicleAutoForOrganizationId({
      organizationId: workspace.id,
      orgSlug: params.orgSlug,
      workOrderId: params.workOrderId,
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
    return await getOperationsVehicleStockBalancesForOrganizationId({
      organizationId: workspace.id,
      vehicleId: params.vehicleId,
    });
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
    return await transferOperationsStockToVehicleForOrganizationId({
      organizationId: workspace.id,
      vehicleId: params.vehicleId,
      itemId: params.itemId,
      qty: params.qty,
    });
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
    return await addOperationsStockToActiveVehicleForOrganizationId({
      organizationId: workspace.id,
      technicianId: params.technicianId,
      itemId: params.itemId,
      qty: params.qty,
    });
  } catch (e: unknown) {
    console.error('[operations] addOperationsStockToActiveVehicle failed', e);
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
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await getOperationsClientOptionsForOrganizationId({ organizationId: workspace.id });
  } catch (e: unknown) {
    console.error('[operations] getOperationsClientOptions failed', e);
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
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await setOperationsWorkOrderCompletionSignatureForOrganizationId({
      organizationId: workspace.id,
      id: params.id,
      signatureUrl: params.signatureUrl,
    });
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
    return await contractorSetWorkOrderCompletionSignatureByToken({
      token: params.token,
      workOrderId: params.workOrderId,
      signatureUrl: params.signatureUrl,
    });
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
    return await addOperationsWorkOrderAttachmentForOrganizationId({
      organizationId: workspace.id,
      workOrderId: params.workOrderId,
      storageBucket: params.storageBucket,
      storagePath: params.storagePath,
      url: params.url,
      mimeType: params.mimeType,
      createdByType: params.createdByType,
      createdByRef: params.createdByRef,
    });
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
    return await getOperationsLocationsByOrganizationId({ organizationId: workspace.id });
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
    return await createOperationsLocationForOrganizationId({ organizationId: workspace.id, name: params.name });
  } catch (e: unknown) {
    console.error('[operations] createOperationsLocation failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת מחסן' };
  }
}

export async function deleteOperationsLocation(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await deleteOperationsLocationForOrganizationId({ organizationId: workspace.id, id: params.id });
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
    return await getOperationsWorkOrderTypesByOrganizationId({ organizationId: workspace.id });
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
    return await createOperationsWorkOrderTypeForOrganizationId({ organizationId: workspace.id, name: params.name });
  } catch (e: unknown) {
    console.error('[operations] createOperationsWorkOrderType failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת סוג קריאה' };
  }
}

export async function deleteOperationsWorkOrderType(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await deleteOperationsWorkOrderTypeForOrganizationId({ organizationId: workspace.id, id: params.id });
  } catch (e: unknown) {
    console.error('[operations] deleteOperationsWorkOrderType failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת סוג קריאה' };
  }
}

export async function getOperationsTechnicianOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsTechnicianOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await getOperationsTechnicianOptionsForOrganizationId({ organizationId: workspace.id });
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
    return await setOperationsWorkOrderAssignedTechnicianForOrganizationId({
      organizationId: workspace.id,
      id: params.id,
      technicianId: params.technicianId,
    });
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
    return await getOperationsWorkOrderAttachmentsForOrganizationId({
      organizationId: workspace.id,
      orgSlug: params.orgSlug,
      workOrderId: params.workOrderId,
    });
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
    return await getOperationsWorkOrderCheckinsForOrganizationId({
      organizationId: workspace.id,
      workOrderId: params.workOrderId,
    });
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
    return await addOperationsWorkOrderCheckinForOrganizationId({
      organizationId: workspace.id,
      workOrderId: params.workOrderId,
      lat: params.lat,
      lng: params.lng,
      accuracy: params.accuracy,
      createdByType: params.createdByType,
      createdByRef: params.createdByRef,
    });
  } catch (e: unknown) {
    console.error('[operations] addOperationsWorkOrderCheckin failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת Check-In' };
  }
}

export async function getOperationsInventoryOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsInventoryOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await getOperationsInventoryOptionsForOrganizationId({ organizationId: workspace.id });
  } catch (e: unknown) {
    console.error('[operations] getOperationsInventoryOptions failed', e);
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
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await getOperationsInventoryOptionsForHolderForOrganizationId({
      organizationId: workspace.id,
      holderId: params.holderId,
    });
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
    return await consumeOperationsInventoryForWorkOrderForOrganizationId({
      organizationId: workspace.id,
      workOrderId: params.workOrderId,
      inventoryId: params.inventoryId,
      qty: params.qty,
    });
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
    return await getOperationsMaterialsForWorkOrderForOrganizationId({
      organizationId: workspace.id,
      workOrderId: params.workOrderId,
    });
  } catch (e: unknown) {
    console.error('[operations] getOperationsMaterialsForWorkOrder failed', e);
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
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await createOperationsContractorTokenForOrganizationId({
      organizationId: workspace.id,
      contractorLabel: params.contractorLabel,
      ttlHours: params.ttlHours,
    });
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
    return await getOperationsContractorPortalDataByToken({ token: params.token });
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
    return await contractorMarkWorkOrderDoneByToken({
      token: params.token,
      workOrderId: params.workOrderId,
    });
  } catch (e: unknown) {
    console.error('[operations] contractorMarkWorkOrderDone failed', e);
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
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await getOperationsDashboardDataForOrganizationId({ organizationId: workspace.id });
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
    return await getOperationsProjectsDataForOrganizationId({ organizationId: workspace.id });
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
    return await getOperationsInventoryDataForOrganizationId({ organizationId: workspace.id });
  } catch (e: unknown) {
    console.error('[operations] getOperationsInventoryData failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת המלאי' };
  }
}

export async function getOperationsProjectOptions(params: {
  orgSlug: string;
}): Promise<{ success: boolean; data?: OperationsProjectOption[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    return await getOperationsProjectOptionsForOrganizationId({ organizationId: workspace.id });
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
    return await getOperationsWorkOrdersDataForOrganizationId({
      organizationId: workspace.id,
      status: params.status,
      projectId: params.projectId,
      assignedTechnicianId: params.assignedTechnicianId,
    });
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
    return await createOperationsWorkOrderForOrganizationId({
      organizationId: workspace.id,
      projectId: params.projectId,
      title: params.title,
      description: params.description,
      scheduledStart: params.scheduledStart,
    });
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
    return await getOperationsWorkOrderByIdForOrganizationId({
      organizationId: workspace.id,
      orgSlug: params.orgSlug,
      id: params.id,
    });
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
    return await setOperationsWorkOrderStatusForOrganizationId({
      organizationId: workspace.id,
      id: params.id,
      status: params.status,
    });
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
    return await createOperationsProjectForOrganizationId({
      organizationId: workspace.id,
      title: params.title,
      canonicalClientId: params.canonicalClientId,
      installationAddress: params.installationAddress,
    });
  } catch (e: unknown) {
    console.error('[operations] createOperationsProject failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פרויקט',
    };
  }
}
