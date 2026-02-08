'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ClientRequest, ManagerRequest } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { uploadFile } from './files';
import { updatePost } from './posts';
import { Prisma } from '@prisma/client';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { createStorageClient } from '@/lib/supabase';
import { resolveStorageUrlsMaybeBatchedWithClient, toSbRefMaybe } from '@/lib/services/operations/storage';

import { asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';

function normalizeClientRequestType(value: unknown): ClientRequest['type'] {
  const v = String(value ?? '').toLowerCase();
  if (v === 'media' || v === 'text' || v === 'campaign') return v;
  return 'text';
}

function normalizeClientRequestStatus(value: unknown): ClientRequest['status'] {
  const v = String(value ?? '').toLowerCase();
  if (v === 'new' || v === 'processed' || v === 'needs_fix') return v;
  return 'new';
}

function normalizeManagerRequestType(value: unknown): ManagerRequest['type'] {
  const v = String(value ?? '').toLowerCase();
  if (v === 'media' || v === 'info' || v === 'feedback') return v;
  return 'info';
}

function normalizeManagerRequestStatus(value: unknown): ManagerRequest['status'] {
  const v = String(value ?? '').toLowerCase();
  if (v === 'pending' || v === 'completed' || v === 'rejected') return v;
  return 'pending';
}

function toIsoStringOrNow(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

async function requireOrganizationIdForOrgSlug(orgSlug: string): Promise<string> {
  const resolvedOrgSlug = String(orgSlug || '').trim();
  if (!resolvedOrgSlug) {
    throw new Error('Missing orgSlug');
  }

  const workspace = await requireWorkspaceAccessByOrgSlugApi(resolvedOrgSlug);
  return String(workspace.id);
}

async function assertClientInOrganization(params: { clientId: string; organizationId: string }): Promise<void> {
  const row = await prisma.clients.findFirst({
    where: {
      id: String(params.clientId),
      organization_id: String(params.organizationId),
    },
    select: { id: true },
  });

  if (!row?.id) {
    throw new Error('Forbidden');
  }
}

async function assertClientRequestInOrganization(params: { requestId: string; organizationId: string }): Promise<{ clientId: string }> {
  const row = await prisma.social_client_requests.findFirst({
    where: {
      id: String(params.requestId),
      organizationId: String(params.organizationId),
    },
    select: { id: true, client_id: true },
  });

  if (!row?.id) {
    throw new Error('Forbidden');
  }

  const clientId = String(row.client_id ?? '').trim();
  if (!clientId) throw new Error('Forbidden');
  return { clientId };
}

async function assertManagerRequestInOrganization(params: { requestId: string; organizationId: string }): Promise<{ clientId: string }> {
  const row = await prisma.social_manager_requests.findFirst({
    where: {
      id: String(params.requestId),
      organizationId: String(params.organizationId),
    },
    select: { id: true, client_id: true },
  });

  if (!row?.id) {
    throw new Error('Forbidden');
  }

  const clientId = String(row.client_id ?? '').trim();
  if (!clientId) throw new Error('Forbidden');
  return { clientId };
}

/**
 * Server Action: Get client requests
 */
export async function getClientRequests(
  orgSlug: string,
  clientId?: string
): Promise<{ success: boolean; data?: ClientRequest[]; error?: string }> {
  try {
    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const rows = await prisma.social_client_requests.findMany({
      where: {
        organizationId,
        ...(clientId ? { client_id: String(clientId) } : {}),
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });

    const raw = (rows || []).map((req) => {
      const mediaRaw = req.media_url == null ? '' : String(req.media_url).trim();
      const stableRef = mediaRaw ? (toSbRefMaybe(mediaRaw) || (mediaRaw.startsWith('sb://') ? mediaRaw : null)) : null;
      return {
        id: String(req.id ?? ''),
        clientId: String(req.client_id ?? ''),
        type: normalizeClientRequestType(req.type),
        content: String(req.content ?? ''),
        mediaRaw,
        mediaRef: stableRef,
        timestamp: toIsoStringOrNow(req.created_at),
        status: normalizeClientRequestStatus(req.status),
        managerComment: req.manager_comment == null ? undefined : String(req.manager_comment),
      };
    });

    const ttlSeconds = 60 * 60;
    const refsOrUrls = raw.map((r) => (r.mediaRef ? r.mediaRef : r.mediaRaw ? r.mediaRaw : null));

    let resolved: (string | null)[] = refsOrUrls.map(() => null);
    try {
      const supabase = createStorageClient();
      resolved = await resolveStorageUrlsMaybeBatchedWithClient(supabase, refsOrUrls, ttlSeconds, { organizationId });
    } catch {
      resolved = refsOrUrls.map(() => null);
    }

    const requests: ClientRequest[] = raw.map((r, idx) => {
      const rawUrl = r.mediaRaw;
      const signedOrRaw = resolved[idx] || (rawUrl && !rawUrl.startsWith('sb://') ? rawUrl : undefined);
      return {
        id: r.id,
        clientId: r.clientId,
        type: r.type,
        content: r.content,
        mediaUrl: signedOrRaw,
        mediaRef: r.mediaRef || undefined,
        timestamp: r.timestamp,
        status: r.status,
        managerComment: r.managerComment,
      };
    });

    return { success: true, data: requests };
  } catch (error: unknown) {
    console.error('Error in getClientRequests:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בטעינת בקשות לקוח'),
    };
  }
}

/**
 * Server Action: Get manager requests
 */
export async function getManagerRequests(
  orgSlug: string,
  clientId?: string
): Promise<{ success: boolean; data?: ManagerRequest[]; error?: string }> {
  try {
    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const rows = await prisma.social_manager_requests.findMany({
      where: {
        organizationId,
        ...(clientId ? { client_id: String(clientId) } : {}),
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });

    const requests: ManagerRequest[] = (rows || []).map((req) => ({
      id: String(req.id ?? ''),
      clientId: String(req.client_id ?? ''),
      title: String(req.title ?? ''),
      description: String(req.description ?? ''),
      type: normalizeManagerRequestType(req.type),
      status: normalizeManagerRequestStatus(req.status),
      createdAt: toIsoStringOrNow(req.created_at),
      feedbackFromClient: req.feedback_from_client == null ? undefined : String(req.feedback_from_client),
    }));

    return { success: true, data: requests };
  } catch (error: unknown) {
    console.error('Error in getManagerRequests:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בטעינת בקשות מנהל'),
    };
  }
}

/**
 * Server Action: Create client request
 */
export async function createClientRequest(
  requestData: {
    orgSlug: string;
    clientId: string;
    type: 'media' | 'text' | 'approval';
    content: string;
    mediaFile?: File | Blob;
    mediaUrl?: string;
  }
): Promise<{ success: boolean; data?: ClientRequest; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(requestData.orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    await assertClientInOrganization({ clientId: requestData.clientId, organizationId });

    // Upload media file if provided
    let mediaUrl = requestData.mediaUrl;
    if (mediaUrl) {
      const stable = toSbRefMaybe(String(mediaUrl));
      if (stable) mediaUrl = stable;
    }
    if (requestData.mediaFile) {
      const uploadResult = await uploadFile(
        requestData.mediaFile,
        `request-${Date.now()}.${requestData.mediaFile.type.split('/')[1] || 'jpg'}`,
        'requests',
        requestData.orgSlug
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    const normalizedType = requestData.type === 'media' ? 'media' : 'text';

    const request = await prisma.social_client_requests.create({
      data: {
        organizationId,
        client_id: String(requestData.clientId),
        type: normalizedType,
        content: String(requestData.content ?? ''),
        media_url: mediaUrl ? String(mediaUrl) : null,
        status: 'new',
      },
    });

    const mediaRaw = request.media_url == null ? undefined : String(request.media_url);
    const stableRef = mediaRaw ? (toSbRefMaybe(mediaRaw) || (mediaRaw.startsWith('sb://') ? mediaRaw : null)) : null;

    let resolvedMediaUrl: string | undefined = undefined;
    if (stableRef) {
      try {
        const supabase = createStorageClient();
        const resolved = await resolveStorageUrlsMaybeBatchedWithClient(supabase, [stableRef], 60 * 60, { organizationId });
        resolvedMediaUrl = resolved[0] || undefined;
      } catch {
        resolvedMediaUrl = undefined;
      }
    } else if (mediaRaw && !mediaRaw.startsWith('sb://')) {
      resolvedMediaUrl = mediaRaw;
    }

    const formattedRequest: ClientRequest = {
      id: String(request.id ?? ''),
      clientId: String(request.client_id ?? ''),
      type: normalizeClientRequestType(request.type),
      content: String(request.content ?? ''),
      mediaUrl: resolvedMediaUrl,
      mediaRef: stableRef || undefined,
      timestamp: toIsoStringOrNow(request.created_at),
      status: normalizeClientRequestStatus(request.status),
    };

    return { success: true, data: formattedRequest };
  } catch (error: unknown) {
    console.error('Error in createClientRequest:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה ביצירת בקשה'),
    };
  }
}

/**
 * Server Action: Create manager request
 */
export async function createManagerRequest(
  requestData: {
    orgSlug: string;
    clientId: string;
    title: string;
    description: string;
    type: 'media' | 'text' | 'approval';
  }
): Promise<{ success: boolean; data?: ManagerRequest; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(requestData.orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    await assertClientInOrganization({ clientId: requestData.clientId, organizationId });

    const normalizedType = requestData.type === 'media' ? 'media' : 'info';

    const request = await prisma.social_manager_requests.create({
      data: {
        organizationId,
        client_id: String(requestData.clientId),
        title: String(requestData.title ?? ''),
        description: String(requestData.description ?? ''),
        type: normalizedType,
        status: 'pending',
      },
    });

    const formattedRequest: ManagerRequest = {
      id: String(request.id ?? ''),
      clientId: String(request.client_id ?? ''),
      title: String(request.title ?? ''),
      description: String(request.description ?? ''),
      type: normalizeManagerRequestType(request.type),
      status: normalizeManagerRequestStatus(request.status),
      createdAt: toIsoStringOrNow(request.created_at),
      feedbackFromClient: request.feedback_from_client == null ? undefined : String(request.feedback_from_client),
    };

    return { success: true, data: formattedRequest };
  } catch (error: unknown) {
    console.error('Error in createManagerRequest:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה ביצירת בקשה'),
    };
  }
}

/**
 * Server Action: Approve client request (and update related post if exists)
 */
export async function approveClientRequest(
  requestId: string,
  orgSlug: string,
  postId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertClientRequestInOrganization({ requestId, organizationId });

    const res = await prisma.social_client_requests.updateMany({
      where: {
        id: String(requestId),
        organizationId,
        client_id: scoped.clientId,
      },
      data: { status: 'processed' },
    });

    if (!res.count) {
      return {
        success: false,
        error: translateError('שגיאה באישור בקשה'),
      };
    }

    // If postId provided, update post status to approved
    if (postId) {
      const result = await updatePost(postId, { status: 'pending_approval', orgSlug });
      if (!result.success) {
        console.error('Error updating post status:', result.error);
        // Don't fail the whole operation
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in approveClientRequest:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה באישור בקשה'),
    };
  }
}

/**
 * Server Action: Reject client request
 */
export async function rejectClientRequest(
  requestId: string,
  orgSlug: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertClientRequestInOrganization({ requestId, organizationId });

    const res = await prisma.social_client_requests.updateMany({
      where: {
        id: String(requestId),
        organizationId,
        client_id: scoped.clientId,
      },
      data: {
        status: 'needs_fix',
        // You might want to add a rejection_reason field to the table
        ...(reason ? { manager_comment: String(reason) } : {}),
      },
    });

    if (!res.count) {
      return {
        success: false,
        error: translateError('שגיאה בדחיית בקשה'),
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in rejectClientRequest:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בדחיית בקשה'),
    };
  }
}

/**
 * Server Action: Update manager request status
 */
export async function updateManagerRequest(
  requestId: string,
  orgSlug: string,
  updates: {
    status?: 'pending' | 'approved' | 'rejected' | 'completed';
    managerComment?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertManagerRequestInOrganization({ requestId, organizationId });

    const normalizedStatus =
      updates.status === undefined
        ? undefined
        : updates.status === 'approved'
          ? 'completed'
          : updates.status;

    const updateData: Prisma.social_manager_requestsUpdateManyMutationInput = {};
    if (normalizedStatus !== undefined) updateData.status = normalizedStatus;

    const res = await prisma.social_manager_requests.updateMany({
      where: {
        id: String(requestId),
        organizationId,
        client_id: scoped.clientId,
      },
      data: updateData,
    });

    if (!res.count) {
      return {
        success: false,
        error: translateError('שגיאה בעדכון בקשה'),
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in updateManagerRequest:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בעדכון בקשה'),
    };
  }
}

