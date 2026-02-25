'use server';

import { logger } from '@/lib/server/logger';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import {
  createOperationsProjectForOrganizationId,
  getOperationsProjectByIdForOrganizationId,
  getOperationsProjectOptionsForOrganizationId,
  getOperationsProjectsDataForOrganizationId,
  updateOperationsProjectForOrganizationId,
} from '@/lib/services/operations/projects';
import { getOperationsDashboardDataForOrganizationId } from '@/lib/services/operations/dashboard';
import { getOperationsClientOptionsForOrganizationId } from '@/lib/services/operations/clients';
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import type {
  OperationsClientOption,
  OperationsDashboardData,
  OperationsProjectsData,
  OperationsProjectDetail,
  OperationsProjectOption,
} from '@/lib/services/operations/types';

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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת נתוני הדשבורד' };
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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הפרויקטים' };
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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הפרויקטים' };
  }
}

export async function getOperationsProjectById(params: {
  orgSlug: string;
  id: string;
}): Promise<{ success: boolean; data?: OperationsProjectDetail; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await getOperationsProjectByIdForOrganizationId({
          organizationId,
          id: params.id,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsProjectById' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsProjectById failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הפרויקט' };
  }
}

export async function updateOperationsProject(params: {
  orgSlug: string;
  id: string;
  title?: string;
  status?: string;
  canonicalClientId?: string | null;
  installationAddress?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) =>
        await updateOperationsProjectForOrganizationId({
          organizationId,
          id: params.id,
          title: params.title,
          status: params.status,
          canonicalClientId: params.canonicalClientId,
          installationAddress: params.installationAddress,
        }),
      { source: 'server_actions_operations', reason: 'updateOperationsProject' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'updateOperationsProject failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון הפרויקט' };
  }
}

export async function createOperationsProject(params: {
  orgSlug: string;
  title: string;
  canonicalClientId?: string;
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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פרויקט' };
  }
}

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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הלקוחות' };
  }
}
