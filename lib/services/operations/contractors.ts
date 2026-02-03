import 'server-only';

import crypto from 'crypto';

import { allowlistedQuery, orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import { setOperationsWorkOrderCompletionSignatureUnsafe } from '@/lib/services/operations/work-orders';
import { asObject, getUnknownErrorMessage, isUuidLike, toIsoDate } from '@/lib/services/operations/shared';
import { resolveStorageUrlMaybe } from '@/lib/services/operations/storage';
import type { OperationsWorkOrderAttachmentRow, OperationsWorkOrderCheckinRow, OperationsWorkOrderStatus } from '@/lib/services/operations/types';

function generatePortalToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function hashPortalToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function resolveOperationsContractorToken(token: string): Promise<{
  ok: boolean;
  organizationId?: string;
  contractorLabel?: string | null;
  tokenHash?: string;
  error?: string;
}> {
  const t = String(token || '').trim();
  if (!t) return { ok: false, error: 'טוקן חסר' };
  if (t.length < 20 || t.length > 200) return { ok: false, error: 'טוקן לא תקין' };
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return { ok: false, error: 'טוקן לא תקין' };
  const tokenHash = hashPortalToken(t);

  const rows = await allowlistedQuery<unknown[]>({
    reason: 'ops_portal_token_lookup',
    query: `
      SELECT organization_id::text as organization_id, contractor_label, expires_at, revoked_at
      FROM operations_contractor_tokens
      WHERE token_hash = $1::text
      LIMIT 1
    `,
    values: [tokenHash],
  });

  const row = asObject((rows || [])[0]);
  if (!row?.organization_id) return { ok: false, error: 'טוקן לא תקין' };
  const expiresAt = row.expires_at ? new Date(String(row.expires_at)) : null;
  const revokedAt = row.revoked_at ? new Date(String(row.revoked_at)) : null;
  if (revokedAt) return { ok: false, error: 'טוקן בוטל' };
  if (!expiresAt || expiresAt.getTime() < Date.now()) return { ok: false, error: 'טוקן פג תוקף' };

  return {
    ok: true,
    organizationId: String(row.organization_id),
    contractorLabel: row.contractor_label ? String(row.contractor_label) : null,
    tokenHash,
  };
}

export async function contractorResolveTokenForApi(params: {
  token: string;
}): Promise<{ success: boolean; organizationId?: string; tokenHash?: string; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }
    return { success: true, organizationId: tokenOut.organizationId, tokenHash: tokenOut.tokenHash };
  } catch (e: unknown) {
    console.error('[operations] contractorResolveTokenForApi failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה באימות טוקן' };
  }
}

export async function contractorValidateWorkOrderAccess(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    return { success: true, organizationId: tokenOut.organizationId };
  } catch (e: unknown) {
    console.error('[operations] contractorValidateWorkOrderAccess failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה באימות גישה' };
  }
}

export async function contractorGetWorkOrderAttachments(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderAttachmentRow[]; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const organizationId = String(tokenOut.organizationId);

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      organizationId,
      `
        SELECT id::text as id, url, mime_type, created_at
        FROM operations_work_order_attachments
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
      `,
      [organizationId, workOrderId]
    );

    const ttlSeconds = 60 * 60;
    const data = await Promise.all(
      (rows || []).map(async (r) => {
        const obj = asObject(r) ?? {};
        const rawUrl = String(obj.url || '');
        const resolved = await resolveStorageUrlMaybe(rawUrl, ttlSeconds, { organizationId });
        return {
          id: String(obj.id),
          url: resolved || rawUrl,
          mimeType: obj.mime_type ? String(obj.mime_type) : null,
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      })
    );

    return { success: true, data };
  } catch (e: unknown) {
    console.error('[operations] contractorGetWorkOrderAttachments failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת קבצים' };
  }
}

export async function contractorAddWorkOrderAttachment(params: {
  token: string;
  workOrderId: string;
  storageBucket?: string;
  storagePath: string;
  url: string;
  mimeType?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const storagePath = String(params.storagePath || '').trim();
    const url = String(params.url || '').trim();
    const storageBucket = params.storageBucket ? String(params.storageBucket).trim() : 'operations-files';
    const mimeType = params.mimeType === undefined ? null : params.mimeType === null ? null : String(params.mimeType);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!storagePath) return { success: false, error: 'חסר נתיב קובץ' };
    if (!url) return { success: false, error: 'חסר URL' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await orgExec(
      prisma,
      String(tokenOut.organizationId),
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
        ) VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, 'CONTRACTOR', $7::text)
      `,
      [
        tokenOut.organizationId,
        workOrderId,
        storageBucket,
        storagePath,
        url,
        mimeType,
        tokenOut.tokenHash ? String(tokenOut.tokenHash) : null,
      ]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] contractorAddWorkOrderAttachment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת קובץ' };
  }
}

export async function contractorGetWorkOrderCheckins(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderCheckinRow[]; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      String(tokenOut.organizationId),
      `
        SELECT id::text as id, lat, lng, accuracy, created_at
        FROM operations_work_order_checkins
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [tokenOut.organizationId, workOrderId]
    );

    return {
      success: true,
      data: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        return {
          id: String(obj.id),
          lat: Number(obj.lat),
          lng: Number(obj.lng),
          accuracy: obj.accuracy === null || obj.accuracy === undefined ? null : Number(obj.accuracy),
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    console.error('[operations] contractorGetWorkOrderCheckins failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת Check-Ins' };
  }
}

export async function contractorAddWorkOrderCheckin(params: {
  token: string;
  workOrderId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const accuracy = params.accuracy === undefined ? null : params.accuracy === null ? null : Number(params.accuracy);

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { success: false, error: 'מיקום לא תקין' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await orgExec(
      prisma,
      String(tokenOut.organizationId),
      `
        INSERT INTO operations_work_order_checkins (organization_id, work_order_id, lat, lng, accuracy, created_by_type, created_by_ref)
        VALUES ($1::uuid, $2::uuid, $3::double precision, $4::double precision, $5::double precision, 'CONTRACTOR', $6::text)
      `,
      [
        tokenOut.organizationId,
        workOrderId,
        lat,
        lng,
        accuracy,
        tokenOut.tokenHash ? String(tokenOut.tokenHash) : null,
      ]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] contractorAddWorkOrderCheckin failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת Check-In' };
  }
}

export async function createOperationsContractorTokenForOrganizationId(params: {
  organizationId: string;
  contractorLabel?: string;
  ttlHours?: number;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const token = generatePortalToken();
    const tokenHash = hashPortalToken(token);
    const ttlHours = Number.isFinite(Number(params.ttlHours)) ? Math.max(1, Number(params.ttlHours)) : 72;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const contractorLabel = params.contractorLabel ? String(params.contractorLabel).trim() : null;

    await orgExec(
      prisma,
      params.organizationId,
      `INSERT INTO operations_contractor_tokens (organization_id, token_hash, contractor_label, expires_at) VALUES ($1::uuid, $2::text, $3::text, $4::timestamptz)`,
      [params.organizationId, tokenHash, contractorLabel, expiresAt.toISOString()]
    );

    return { success: true, token };
  } catch (e: unknown) {
    console.error('[operations] createOperationsContractorToken failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה ביצירת טוקן קבלן',
    };
  }
}

export async function getOperationsContractorPortalDataByToken(params: {
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
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }

    const organizationKey = String(tokenOut.organizationId).trim();

    let organizationId = organizationKey;
    let orgSlug: string | null = null;

    if (isUuidLike(organizationKey)) {
      const org = await prisma.social_organizations.findFirst({
        where: { id: organizationKey },
        select: { id: true, slug: true },
      });
      if (org?.id) organizationId = String(org.id);
      orgSlug = org?.slug ? String(org.slug) : null;
    } else {
      const org = await prisma.social_organizations.findFirst({
        where: { slug: organizationKey },
        select: { id: true, slug: true },
      });
      if (!org?.id) {
        return { success: false, error: 'ארגון לא נמצא' };
      }
      organizationId = String(org.id);
      orgSlug = org?.slug ? String(org.slug) : null;
    }

    const workOrders = await prisma.operationsWorkOrder.findMany({
      where: { organizationId, status: { not: 'DONE' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        installationAddress: true,
        scheduledStart: true,
        project: { select: { title: true } },
      },
    });

    return {
      success: true,
      data: {
        organizationId,
        orgSlug,
        contractorLabel: tokenOut.contractorLabel ?? null,
        workOrders: workOrders.map((w) => ({
          id: w.id,
          title: w.title,
          status: String(w.status) as OperationsWorkOrderStatus,
          projectTitle: w.project.title,
          installationAddress: w.installationAddress ? String(w.installationAddress) : null,
          scheduledStart: w.scheduledStart ? w.scheduledStart.toISOString() : null,
        })),
      },
    };
  } catch (e: unknown) {
    console.error('[operations] getOperationsContractorPortalData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת פורטל קבלן',
    };
  }
}

export async function contractorMarkWorkOrderDoneByToken(params: {
  token: string;
  workOrderId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) {
      return { success: false, error: tokenOut.error || 'גישה נדחתה' };
    }

    const organizationId = String(tokenOut.organizationId);

    const updated = await prisma.operationsWorkOrder.updateMany({
      where: { id: workOrderId, organizationId },
      data: { status: 'DONE' },
    });

    if (updated.count < 1) {
      return { success: false, error: 'קריאה לא נמצאה' };
    }

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] contractorMarkWorkOrderDone failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס',
    };
  }
}

export async function contractorSetWorkOrderCompletionSignatureByToken(params: {
  token: string;
  workOrderId: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenOut = await resolveOperationsContractorToken(params.token);
    if (!tokenOut.ok || !tokenOut.organizationId) return { success: false, error: tokenOut.error || 'גישה נדחתה' };

    const workOrderId = String(params.workOrderId || '').trim();
    const signatureUrl = String(params.signatureUrl || '').trim();

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!signatureUrl) return { success: false, error: 'חסר URL חתימה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: tokenOut.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה' };

    await setOperationsWorkOrderCompletionSignatureUnsafe({
      organizationId: tokenOut.organizationId,
      workOrderId,
      signatureUrl,
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] contractorSetWorkOrderCompletionSignature failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת חתימה' };
  }
}
