'use server';

import { logger } from '@/lib/server/logger';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { insertMisradNotificationsForOrganizationId } from '@/lib/services/system/notifications';
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
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import type {
  OperationsWorkOrderAttachmentRow,
  OperationsWorkOrderCheckinRow,
  OperationsWorkOrdersData,
  OperationsWorkOrderStatus,
} from '@/lib/services/operations/types';

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

export async function setOperationsWorkOrderAssignedTechnician(params: {
  orgSlug: string;
  id: string;
  technicianId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => {
        const result = await setOperationsWorkOrderAssignedTechnicianForOrganizationId({
          organizationId,
          id: params.id,
          technicianId: params.technicianId,
        });
        if (result.success && params.technicianId) {
          insertMisradNotificationsForOrganizationId({
            organizationId,
            recipientIds: [params.technicianId],
            type: 'WORK_ORDER',
            text: `שויכת לקריאת שירות חדשה`,
            reason: 'ops_work_order_assigned',
          }).catch(() => null);
        }
        return result;
      },
      { source: 'server_actions_operations', reason: 'setOperationsWorkOrderAssignedTechnician' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'setOperationsWorkOrderAssignedTechnician failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשיוך טכנאי לקריאה' };
  }
}

export async function getOperationsWorkOrdersData(params: {
  orgSlug: string;
  status?: 'OPEN' | 'ALL' | OperationsWorkOrderStatus;
  projectId?: string;
  assignedTechnicianId?: string;
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
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
          departmentId: params.departmentId,
          search: params.search,
          page: params.page,
          limit: params.limit,
        }),
      { source: 'server_actions_operations', reason: 'getOperationsWorkOrdersData' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'getOperationsWorkOrdersData failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאות' };
  }
}

export async function bulkUpdateOperationsWorkOrderStatus(params: {
  orgSlug: string;
  ids: string[];
  status: OperationsWorkOrderStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!params.ids.length) return { success: true };
    const results = await Promise.all(
      params.ids.map((id) =>
        withWorkspaceTenantContext(
          params.orgSlug,
          async ({ organizationId }) =>
            await setOperationsWorkOrderStatusForOrganizationId({
              organizationId,
              id,
              status: params.status,
            }),
          { source: 'server_actions_operations', reason: 'bulkUpdateOperationsWorkOrderStatus' }
        )
      )
    );
    const failed = results.filter((r) => !r.success);
    if (failed.length) {
      return { success: false, error: `${failed.length} מתוך ${params.ids.length} נכשלו` };
    }
    return { success: true };
  } catch (e: unknown) {
    logger.error('operations', 'bulkUpdateOperationsWorkOrderStatus failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס מרובה' };
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
      async ({ organizationId }) => {
        const result = await createOperationsWorkOrderForOrganizationId({
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
        });
        if (result.success && params.assignedTechnicianId) {
          const priorityLabel = params.priority === 'CRITICAL' ? ' (קריטי!)' : params.priority === 'URGENT' ? ' (דחוף)' : '';
          insertMisradNotificationsForOrganizationId({
            organizationId,
            recipientIds: [params.assignedTechnicianId],
            type: 'WORK_ORDER',
            text: `קריאת שירות חדשה שויכה אליך: ${params.title}${priorityLabel}`,
            reason: 'ops_work_order_created_assigned',
          }).catch(() => null);
        }
        return result;
      },
      { source: 'server_actions_operations', reason: 'createOperationsWorkOrder' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'createOperationsWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת קריאה' };
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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאה' };
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
      async ({ organizationId }) => {
        const result = await setOperationsWorkOrderStatusForOrganizationId({
          organizationId,
          id: params.id,
          status: params.status,
        });
        if (result.success) {
          try {
            const woRes = await getOperationsWorkOrderByIdForOrganizationId({ organizationId, orgSlug: params.orgSlug, id: params.id });
            const wo = woRes.success ? woRes.data : null;
            if (wo) {
              const statusLabel = params.status === 'DONE' ? 'הושלמה' : params.status === 'IN_PROGRESS' ? 'בטיפול' : 'חדשה';
              const recipients: string[] = [];
              if (wo.assignedTechnicianId) recipients.push(wo.assignedTechnicianId);
              if (recipients.length > 0) {
                insertMisradNotificationsForOrganizationId({
                  organizationId,
                  recipientIds: recipients,
                  type: 'WORK_ORDER',
                  text: `קריאה "${wo.title}" עודכנה לסטטוס: ${statusLabel}`,
                  reason: 'ops_work_order_status_changed',
                }).catch(() => null);
              }
            }
          } catch {
            // fire-and-forget notification
          }
        }
        return result;
      },
      { source: 'server_actions_operations', reason: 'setOperationsWorkOrderStatus' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'setOperationsWorkOrderStatus failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס קריאה' };
  }
}

export async function updateOperationsWorkOrder(params: {
  orgSlug: string;
  id: string;
  title?: string;
  description?: string | null;
  priority?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await withWorkspaceTenantContext(
      params.orgSlug,
      async ({ organizationId }) => {
        const id = String(params.id || '').trim();
        if (!id) return { success: false, error: 'חסר מזהה קריאה' };

        const wo = await import('@/lib/services/operations/db').then((m) => m.prisma).then((p) =>
          p.operationsWorkOrder.findFirst({
            where: { id, organizationId },
            select: { id: true },
          })
        );
        if (!wo) return { success: false, error: 'קריאה לא נמצאה' };

        const data: Record<string, unknown> = {};
        if (params.title !== undefined) {
          const title = String(params.title || '').trim();
          if (!title) return { success: false, error: 'חובה להזין כותרת' };
          data.title = title;
        }
        if (params.description !== undefined) {
          data.description = params.description ? String(params.description).trim() : null;
        }
        if (params.priority !== undefined) {
          const p = String(params.priority).trim();
          if (!['NORMAL', 'HIGH', 'URGENT', 'CRITICAL'].includes(p)) {
            return { success: false, error: 'עדיפות לא חוקית' };
          }
          data.priority = p;
        }

        if (Object.keys(data).length > 0) {
          const { prisma: db } = await import('@/lib/services/operations/db');
          await db.operationsWorkOrder.updateMany({
            where: { id, organizationId },
            data,
          });
        }

        return { success: true };
      },
      { source: 'server_actions_operations', reason: 'updateOperationsWorkOrder' }
    );
  } catch (e: unknown) {
    logger.error('operations', 'updateOperationsWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון קריאה' };
  }
}
