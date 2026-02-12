import 'server-only';

import { createServiceRoleClientScoped } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';

import {
  contractorResolveTokenForApi,
  contractorValidateWorkOrderAccess,
} from '@/lib/services/operations/contractors';

const OPS_BUCKET = 'operations-files';

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;
const MAX_SIGNATURE_SIZE = 4 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return String(name || 'upload')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 160);
}

function sanitizeSlugSegment(v: string): string {
  return String(v || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
}

function isAllowedAttachmentMimeType(mime: string): boolean {
  const m = String(mime || '').trim().toLowerCase();
  if (!m) return false;
  if (m === 'application/pdf') return true;
  return m.startsWith('image/');
}

export async function uploadOpsWorkOrderAttachmentInternal(params: {
  orgSlug: string;
  workOrderId: string;
  file: File;
}): Promise<{ success: boolean; bucket?: string; path?: string; ref?: string; mimeType?: string; error?: string }> {
  try {
    const file = params.file;
    if (!file) return { success: false, error: 'חסר קובץ' };
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return { success: false, error: 'הקובץ גדול מדי (מקסימום 50MB)' };
    }

    const mimeType = String(file.type || '').trim();
    if (!isAllowedAttachmentMimeType(mimeType)) {
      return { success: false, error: 'סוג קובץ לא נתמך. מותר: תמונות או PDF' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const organizationId = String(workspace.id);

    const supabase = createServiceRoleClientScoped({
      reason: 'ops_work_order_attachment_upload',
      scopeColumn: 'organization_id',
      scopeId: organizationId,
    });

    const safeOrg = sanitizeSlugSegment(params.orgSlug);
    const safeName = sanitizeFileName(file.name);
    const filePath = `${organizationId}/ops/internal/${safeOrg}/work-orders/${String(params.workOrderId)}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(OPS_BUCKET).upload(filePath, bytes, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true,
    });

    if (uploadError) {
      return { success: false, error: uploadError.message ? String(uploadError.message) : 'שגיאה בהעלאת קובץ' };
    }

    const ref = `sb://${OPS_BUCKET}/${filePath}`;

    return { success: true, bucket: OPS_BUCKET, path: filePath, ref, mimeType };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) || 'שגיאה בהעלאת קובץ' };
  }
}

export async function uploadOpsWorkOrderSignatureInternal(params: {
  orgSlug: string;
  workOrderId: string;
  signatureDataUrl: string;
}): Promise<{ success: boolean; bucket?: string; path?: string; ref?: string; error?: string }> {
  try {
    const signatureDataUrl = String(params.signatureDataUrl || '').trim();
    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
      return { success: false, error: 'חובה לצרף חתימה' };
    }

    const base64 = signatureDataUrl.includes('base64,') ? signatureDataUrl.split('base64,')[1] : '';
    if (!base64) return { success: false, error: 'חתימה לא תקינה' };

    const fileBuffer = Buffer.from(base64, 'base64');
    if (fileBuffer.length > MAX_SIGNATURE_SIZE) {
      return { success: false, error: 'חתימה גדולה מדי' };
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const organizationId = String(workspace.id);

    const supabase = createServiceRoleClientScoped({
      reason: 'ops_work_order_signature_upload',
      scopeColumn: 'organization_id',
      scopeId: organizationId,
    });

    const safeOrg = sanitizeSlugSegment(params.orgSlug);
    const filePath = `${organizationId}/ops/internal/${safeOrg}/work-orders/${String(params.workOrderId)}/signature.png`;

    const { error: uploadError } = await supabase.storage.from(OPS_BUCKET).upload(filePath, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

    if (uploadError) {
      return { success: false, error: uploadError.message ? String(uploadError.message) : 'שגיאה בהעלאת חתימה' };
    }

    const ref = `sb://${OPS_BUCKET}/${filePath}`;

    return { success: true, bucket: OPS_BUCKET, path: filePath, ref };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) || 'שגיאה בהעלאת חתימה' };
  }
}

export async function uploadOpsPortalWorkOrderAttachment(params: {
  token: string;
  workOrderId: string;
  file: File;
}): Promise<{ success: boolean; bucket?: string; path?: string; ref?: string; mimeType?: string; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const file = params.file;
    if (!file) return { success: false, error: 'חסר קובץ' };
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return { success: false, error: 'הקובץ גדול מדי (מקסימום 50MB)' };
    }

    const mimeType = String(file.type || '').trim();
    if (!isAllowedAttachmentMimeType(mimeType)) {
      return { success: false, error: 'סוג קובץ לא נתמך. מותר: תמונות או PDF' };
    }

    const access = await contractorValidateWorkOrderAccess({ token: params.token, workOrderId });
    if (!access.success || !access.organizationId) {
      return { success: false, error: access.error ? String(access.error) : 'גישה נדחתה' };
    }

    const tokenResolved = await contractorResolveTokenForApi({ token: params.token });
    if (!tokenResolved.success || !tokenResolved.tokenHash) {
      return { success: false, error: tokenResolved.error ? String(tokenResolved.error) : 'גישה נדחתה' };
    }

    const organizationId = String(access.organizationId).trim();

    const supabase = createServiceRoleClientScoped({
      reason: 'ops_portal_attachment_upload',
      scopeColumn: 'organization_id',
      scopeId: organizationId,
    });

    const safeName = sanitizeFileName(file.name);
    const filePath = `${organizationId}/ops/contractor/${String(tokenResolved.tokenHash)}/work-orders/${workOrderId}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(OPS_BUCKET).upload(filePath, bytes, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true,
    });

    if (uploadError) {
      return { success: false, error: uploadError.message ? String(uploadError.message) : 'שגיאה בהעלאת קובץ' };
    }

    const ref = `sb://${OPS_BUCKET}/${filePath}`;

    return { success: true, bucket: OPS_BUCKET, path: filePath, ref, mimeType };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) || 'שגיאה בהעלאת קובץ' };
  }
}

export async function uploadOpsPortalWorkOrderSignature(params: {
  token: string;
  workOrderId: string;
  signatureDataUrl: string;
}): Promise<{ success: boolean; bucket?: string; path?: string; ref?: string; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const signatureDataUrl = String(params.signatureDataUrl || '').trim();
    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
      return { success: false, error: 'חובה לצרף חתימה' };
    }

    const base64 = signatureDataUrl.includes('base64,') ? signatureDataUrl.split('base64,')[1] : '';
    if (!base64) return { success: false, error: 'חתימה לא תקינה' };

    const fileBuffer = Buffer.from(base64, 'base64');
    if (fileBuffer.length > MAX_SIGNATURE_SIZE) {
      return { success: false, error: 'חתימה גדולה מדי' };
    }

    const access = await contractorValidateWorkOrderAccess({ token: params.token, workOrderId });
    if (!access.success || !access.organizationId) {
      return { success: false, error: access.error ? String(access.error) : 'גישה נדחתה' };
    }

    const tokenResolved = await contractorResolveTokenForApi({ token: params.token });
    if (!tokenResolved.success || !tokenResolved.tokenHash) {
      return { success: false, error: tokenResolved.error ? String(tokenResolved.error) : 'גישה נדחתה' };
    }

    const organizationId = String(access.organizationId).trim();

    const supabase = createServiceRoleClientScoped({
      reason: 'ops_portal_signature_upload',
      scopeColumn: 'organization_id',
      scopeId: organizationId,
    });

    const filePath = `${organizationId}/ops/contractor/${String(tokenResolved.tokenHash)}/work-orders/${workOrderId}/signature.png`;

    const { error: uploadError } = await supabase.storage.from(OPS_BUCKET).upload(filePath, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

    if (uploadError) {
      return { success: false, error: uploadError.message ? String(uploadError.message) : 'שגיאה בהעלאת חתימה' };
    }

    const ref = `sb://${OPS_BUCKET}/${filePath}`;

    return { success: true, bucket: OPS_BUCKET, path: filePath, ref };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) || 'שגיאה בהעלאת חתימה' };
  }
}

export function parseSbRefForOps(ref: string): { bucket: string; path: string } | null {
  const raw = String(ref || '').trim();
  if (!raw.startsWith('sb://')) return null;
  const rest = raw.slice('sb://'.length);
  const idx = rest.indexOf('/');
  if (idx <= 0) return null;
  const bucket = rest.slice(0, idx);
  const path = rest.slice(idx + 1);
  if (!bucket || !path) return null;
  if (bucket !== OPS_BUCKET) return null;
  return { bucket, path };
}

export function isOpsUploadOk(value: unknown): boolean {
  const obj = asObject(value);
  return !!obj;
}
