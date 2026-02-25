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
  getOperationsTechnicianOptionsForOrganizationId,
  setOperationsTechnicianActiveVehicleForOrganizationId,
} from '@/lib/services/operations/technicians';
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import type { OperationsVehicleRow, OperationsTechnicianOption } from '@/lib/services/operations/types';

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
