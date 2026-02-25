'use server';

import { logger } from '@/lib/server/logger';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import {
  createOperationsLocationForOrganizationId,
  deleteOperationsLocationForOrganizationId,
  getOperationsLocationsByOrganizationId,
} from '@/lib/services/operations/locations';
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
  createOperationsSupplierForOrganizationId,
  deleteOperationsSupplierForOrganizationId,
  getOperationsSuppliersByOrganizationId,
} from '@/lib/services/operations/suppliers';
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import type {
  OperationsLocationRow,
  OperationsWorkOrderTypeRow,
  OperationsBuildingRow,
  OperationsCallCategoryRow,
  OperationsDepartmentRow,
  OperationsCallMessageRow,
  OperationsSupplierRow,
} from '@/lib/services/operations/types';

// ──── Locations ────

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

// ──── Work Order Types ────

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
