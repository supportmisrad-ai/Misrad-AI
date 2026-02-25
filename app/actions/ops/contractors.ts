'use server';

import { logger } from '@/lib/server/logger';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
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
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import type { OperationsWorkOrderAttachmentRow, OperationsWorkOrderCheckinRow, OperationsWorkOrderStatus } from '@/lib/services/operations/types';

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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת טוקן קבלן' };
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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת פורטל קבלן' };
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
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס' };
  }
}
