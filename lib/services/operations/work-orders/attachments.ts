import 'server-only';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import {
  ALLOW_SCHEMA_FALLBACKS,
  asObject,
  getUnknownErrorMessage,
  isSchemaMismatchError,
  logOperationsError,
  toIsoDate,
} from '@/lib/services/operations/shared';
import { resolveStorageUrlsMaybeBatched } from '@/lib/services/operations/storage';
import type { OperationsWorkOrderAttachmentRow } from '@/lib/services/operations/types';

export async function addOperationsWorkOrderAttachmentForOrganizationId(params: {
  organizationId: string;
  workOrderId: string;
  storageBucket?: string;
  storagePath: string;
  url: string;
  mimeType?: string | null;
  createdByType?: 'INTERNAL' | 'CONTRACTOR';
  createdByRef?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    const storagePath = String(params.storagePath || '').trim();
    const url = String(params.url || '').trim();
    const storageBucket = params.storageBucket ? String(params.storageBucket).trim() : 'operations-files';
    const createdByType = params.createdByType ? String(params.createdByType) : 'INTERNAL';
    const createdByRef = params.createdByRef ? String(params.createdByRef) : null;
    const mimeType = params.mimeType === undefined ? null : params.mimeType === null ? null : String(params.mimeType);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!storagePath) return { success: false, error: 'חסר נתיב קובץ' };
    if (!url) return { success: false, error: 'חסר URL' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await orgExec(
      prisma,
      params.organizationId,
      `
        INSERT INTO operations_work_order_attachments (
          organization_id,
          work_order_id,
          storage_bucket,
          storage_path,
          url,
          mime_type,
          created_by_type,
          created_by_ref
        ) VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text)
      `,
      [params.organizationId, workOrderId, storageBucket, storagePath, url, mimeType, createdByType, createdByRef]
    );

    return { success: true };
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] operations_work_order_attachments missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`
      );
    }
    logOperationsError('[operations] addOperationsWorkOrderAttachment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת קובץ לקריאה' };
  }
}

export async function getOperationsWorkOrderAttachmentsForOrganizationId(params: {
  organizationId: string;
  orgSlug?: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderAttachmentRow[]; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text as id, url, mime_type, created_at
        FROM operations_work_order_attachments
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
      `,
      [params.organizationId, workOrderId]
    );

    const ttlSeconds = 60 * 60;
    const rawUrls = (rows || []).map((r) => {
      const obj = asObject(r) ?? {};
      return String(obj.url || '');
    });
    const resolvedUrls = await resolveStorageUrlsMaybeBatched(rawUrls, ttlSeconds, {
      organizationId: params.organizationId,
      orgSlug: params.orgSlug || null,
    });

    const data = (rows || []).map((r, idx) => {
      const obj = asObject(r) ?? {};
      const rawUrl = String(obj.url || '');
      const resolved = resolvedUrls[idx] ?? null;
      return {
        id: String(obj.id),
        url: resolved || rawUrl,
        mimeType: obj.mime_type ? String(obj.mime_type) : null,
        createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
      };
    });

    return { success: true, data };
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] operations_work_order_attachments missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`
      );
    }
    logOperationsError('[operations] getOperationsWorkOrderAttachments failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת קבצים לקריאה' };
  }
}
