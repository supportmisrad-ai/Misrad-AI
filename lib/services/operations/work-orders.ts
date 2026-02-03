import 'server-only';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, toIsoDate } from '@/lib/services/operations/shared';
import { resolveStorageUrlMaybe } from '@/lib/services/operations/storage';
import {
  ensureOperationsPrimaryWarehouseHolderId,
  resolveDefaultOperationsStockSourceHolderIdForTechnician,
  resolveOperationsStockHolderLabel,
} from '@/lib/services/operations/stock-holders';
import type {
  OperationsWorkOrderAttachmentRow,
  OperationsWorkOrderCheckinRow,
  OperationsWorkOrdersData,
  OperationsWorkOrderStatus,
} from '@/lib/services/operations/types';

async function setOperationsWorkOrderCompletionSignatureUnsafe(params: {
  organizationId: string;
  workOrderId: string;
  signatureUrl: string;
}) {
  await orgExec(
    prisma,
    params.organizationId,
    `
      UPDATE operations_work_orders
      SET completion_signature_url = $3::text
      WHERE organization_id = $1::uuid
        AND id = $2::uuid
    `,
    [params.organizationId, params.workOrderId, params.signatureUrl]
  );
}

async function setOperationsWorkOrderCompletionSignatureForOrganizationId(params: {
  organizationId: string;
  id: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    const signatureUrl = String(params.signatureUrl || '').trim();

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };
    if (!signatureUrl) return { success: false, error: 'חסר URL חתימה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await setOperationsWorkOrderCompletionSignatureUnsafe({ organizationId: params.organizationId, workOrderId: id, signatureUrl });
    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] setOperationsWorkOrderCompletionSignature failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת חתימה' };
  }
}

async function addOperationsWorkOrderAttachmentForOrganizationId(params: {
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
    console.error('[operations] addOperationsWorkOrderAttachment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת קובץ לקריאה' };
  }
}

async function getOperationsWorkOrderAttachmentsForOrganizationId(params: {
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
    const data = await Promise.all(
      (rows || []).map(async (r) => {
        const obj = asObject(r) ?? {};
        const rawUrl = String(obj.url || '');
        const resolved = await resolveStorageUrlMaybe(rawUrl, ttlSeconds, {
          organizationId: params.organizationId,
          orgSlug: params.orgSlug || null,
        });
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
    console.error('[operations] getOperationsWorkOrderAttachments failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת קבצים לקריאה' };
  }
}

async function getOperationsWorkOrderCheckinsForOrganizationId(params: {
  organizationId: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderCheckinRow[]; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text as id, lat, lng, accuracy, created_at
        FROM operations_work_order_checkins
        WHERE organization_id = $1::uuid
          AND work_order_id = $2::uuid
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [params.organizationId, workOrderId]
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
    console.error('[operations] getOperationsWorkOrderCheckins failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת Check-In לקריאה' };
  }
}

async function addOperationsWorkOrderCheckinForOrganizationId(params: {
  organizationId: string;
  workOrderId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  createdByType?: 'INTERNAL' | 'CONTRACTOR';
  createdByRef?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const workOrderId = String(params.workOrderId || '').trim();
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const accuracy = params.accuracy === undefined ? null : params.accuracy === null ? null : Number(params.accuracy);
    const createdByType = params.createdByType ? String(params.createdByType) : 'INTERNAL';
    const createdByRef = params.createdByRef ? String(params.createdByRef) : null;

    if (!workOrderId) return { success: false, error: 'חסר מזהה קריאה' };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { success: false, error: 'מיקום לא תקין' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id: workOrderId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await orgExec(
      prisma,
      params.organizationId,
      `
        INSERT INTO operations_work_order_checkins (organization_id, work_order_id, lat, lng, accuracy, created_by_type, created_by_ref)
        VALUES ($1::uuid, $2::uuid, $3::double precision, $4::double precision, $5::double precision, $6::text, $7::text)
      `,
      [params.organizationId, workOrderId, lat, lng, accuracy, createdByType, createdByRef]
    );

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] addOperationsWorkOrderCheckin failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת Check-In' };
  }
}

async function setOperationsWorkOrderAssignedTechnicianForOrganizationId(params: {
  organizationId: string;
  id: string;
  technicianId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    const technicianIdRaw = params.technicianId === null ? null : String(params.technicianId || '').trim();
    const technicianId = technicianIdRaw ? technicianIdRaw : null;

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };

    if (technicianId) {
      const tech = await prisma.profile.findFirst({
        where: { id: technicianId, organizationId: params.organizationId },
        select: { id: true },
      });
      if (!tech?.id) {
        return { success: false, error: 'טכנאי לא תקין או שאין הרשאה' };
      }

      await orgExec(
        prisma,
        params.organizationId,
        `UPDATE operations_work_orders SET assigned_technician_id = $1::uuid WHERE id = $2::uuid AND organization_id = $3::uuid`,
        [technicianId, id, params.organizationId]
      );
    } else {
      await orgExec(
        prisma,
        params.organizationId,
        `UPDATE operations_work_orders SET assigned_technician_id = NULL WHERE id = $1::uuid AND organization_id = $2::uuid`,
        [id, params.organizationId]
      );
    }

    // Best effort: set stock source for the work order (only if not already set)
    try {
      const holderId = technicianId
        ? await resolveDefaultOperationsStockSourceHolderIdForTechnician({
            organizationId: params.organizationId,
            technicianId,
          })
        : await ensureOperationsPrimaryWarehouseHolderId({ organizationId: params.organizationId });

      await orgExec(
        prisma,
        params.organizationId,
        `
          UPDATE operations_work_orders
          SET stock_source_holder_id = $1::uuid
          WHERE id = $2::uuid
            AND organization_id = $3::uuid
            AND stock_source_holder_id IS NULL
        `,
        [holderId, id, params.organizationId]
      );
    } catch {
      // ignore
    }

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] setOperationsWorkOrderAssignedTechnician failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשיוך טכנאי לקריאה' };
  }
}

async function geocodeAddressNominatim(address: string): Promise<{ lat: number; lng: number } | null> {
  const q = String(address || '').trim();
  if (!q) return null;

  const userAgent =
    (process.env.NOMINATIM_USER_AGENT && String(process.env.NOMINATIM_USER_AGENT).trim()) ||
    'MisradCRM/1.0';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'he-IL,he,en-US,en',
        'User-Agent': userAgent,
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data: unknown = await res.json();
    const first = Array.isArray(data) ? asObject(data[0]) : null;
    const lat = first?.lat ? Number(first.lat) : NaN;
    const lng = first?.lon ? Number(first.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getOperationsWorkOrdersDataForOrganizationId(params: {
  organizationId: string;
  status?: 'OPEN' | 'ALL' | OperationsWorkOrderStatus;
  projectId?: string;
  assignedTechnicianId?: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrdersData; error?: string }> {
  try {
    const status = params.status || 'OPEN';
    const projectId = params.projectId ? String(params.projectId).trim() : '';
    const assignedTechnicianId = params.assignedTechnicianId ? String(params.assignedTechnicianId).trim() : '';

    const values: unknown[] = [params.organizationId];
    let idx = values.length;

    let whereSql = `wo.organization_id = $1::uuid`;

    if (projectId) {
      idx += 1;
      values.push(projectId);
      whereSql += ` AND wo.project_id = $${idx}::uuid`;
    }

    if (status === 'OPEN') {
      whereSql += ` AND wo.status <> 'DONE'`;
    } else if (status !== 'ALL') {
      idx += 1;
      values.push(status);
      whereSql += ` AND wo.status = $${idx}::text`;
    }

    if (assignedTechnicianId) {
      idx += 1;
      values.push(assignedTechnicianId);
      whereSql += ` AND wo.assigned_technician_id = $${idx}::uuid`;
    }

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          wo.id::text as id,
          wo.title as title,
          wo.status as status,
          wo.project_id::text as project_id,
          p.title as project_title,
          wo.assigned_technician_id::text as assigned_technician_id,
          wo.installation_lat as installation_lat,
          wo.installation_lng as installation_lng,
          wo.created_at as created_at
        FROM operations_work_orders wo
        JOIN operations_projects p
          ON p.id = wo.project_id
        WHERE ${whereSql}
        ORDER BY wo.created_at DESC
      `,
      values
    );

    const technicianIds = Array.from(
      new Set(
        (rows || [])
          .map((r) => {
            const obj = asObject(r);
            return obj?.assigned_technician_id ? String(obj.assigned_technician_id) : null;
          })
          .filter(Boolean)
      )
    ) as string[];

    const technicians = technicianIds.length
      ? await prisma.profile.findMany({
          where: { organizationId: params.organizationId, id: { in: technicianIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];

    const techById = new Map<string, string>();
    for (const t of technicians) {
      techById.set(String(t.id), String(t.fullName || t.email || t.id));
    }

    const data: OperationsWorkOrdersData = {
      workOrders: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        const assignedId = obj.assigned_technician_id ? String(obj.assigned_technician_id) : '';
        const latRaw = obj.installation_lat;
        const lngRaw = obj.installation_lng;
        return {
          id: String(obj.id ?? ''),
          title: String(obj.title ?? ''),
          projectId: String(obj.project_id ?? ''),
          projectTitle: String(obj.project_title ?? ''),
          status: String(obj.status ?? 'NEW') as OperationsWorkOrderStatus,
          technicianLabel: assignedId ? techById.get(assignedId) ?? null : null,
          installationLat: latRaw === null || latRaw === undefined ? null : Number(latRaw),
          installationLng: lngRaw === null || lngRaw === undefined ? null : Number(lngRaw),
        };
      }),
    };

    return { success: true, data };
  } catch (e: unknown) {
    console.error('[operations] getOperationsWorkOrdersData failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאות' };
  }
}

async function createOperationsWorkOrderForOrganizationId(params: {
  organizationId: string;
  projectId: string;
  title: string;
  description?: string;
  scheduledStart?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const projectId = String(params.projectId || '').trim();
    const title = String(params.title || '').trim();
    const description = String(params.description || '').trim();
    const scheduledStartRaw = String(params.scheduledStart || '').trim();

    if (!title) return { success: false, error: 'חובה להזין כותרת' };
    if (!projectId) return { success: false, error: 'חובה לשייך פרויקט' };

    const project = await prisma.operationsProject.findFirst({
      where: { id: projectId, organizationId: params.organizationId },
      select: { id: true, installationAddress: true, addressNormalized: true },
    });

    if (!project?.id) return { success: false, error: 'פרויקט לא נמצא או שאין הרשאה' };

    let scheduledStart: Date | null = null;
    if (scheduledStartRaw) {
      const d = new Date(scheduledStartRaw);
      if (!Number.isNaN(d.getTime())) {
        scheduledStart = d;
      }
    }

    const created = await prisma.operationsWorkOrder.create({
      data: {
        organizationId: params.organizationId,
        projectId: project.id,
        title,
        description: description ? description : null,
        status: 'NEW',
        scheduledStart,
        installationAddress: project.installationAddress,
        addressNormalized: project.addressNormalized,
      },
      select: { id: true },
    });

    const address = project.installationAddress ? String(project.installationAddress) : '';
    if (address) {
      const coords = await geocodeAddressNominatim(address);
      if (coords) {
        await orgExec(
          prisma,
          params.organizationId,
          `
            UPDATE operations_work_orders
            SET installation_lat = $1::double precision,
                installation_lng = $2::double precision
            WHERE organization_id = $3::uuid
              AND id = $4::uuid
          `,
          [coords.lat, coords.lng, params.organizationId, created.id]
        );
      }
    }

    return { success: true, id: created.id };
  } catch (e: unknown) {
    console.error('[operations] createOperationsWorkOrder failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת קריאה' };
  }
}

async function getOperationsWorkOrderByIdForOrganizationId(params: {
  organizationId: string;
  orgSlug?: string;
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
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה קריאה' };

    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT
          wo.id::text as id,
          wo.title as title,
          wo.description as description,
          wo.status as status,
          wo.scheduled_start as scheduled_start,
          wo.installation_address as installation_address,
          wo.stock_source_holder_id::text as stock_source_holder_id,
          wo.completion_signature_url as completion_signature_url,
          wo.created_at as created_at,
          wo.updated_at as updated_at,
          wo.project_id::text as project_id,
          p.title as project_title,
          wo.assigned_technician_id::text as assigned_technician_id
        FROM operations_work_orders wo
        JOIN operations_projects p
          ON p.id = wo.project_id
        WHERE wo.organization_id = $1::uuid
          AND wo.id = $2::uuid
        LIMIT 1
      `,
      [params.organizationId, id]
    );

    const row = asObject((rows || [])[0]);
    if (!row?.id) return { success: false, error: 'קריאה לא נמצאה' };

    const assignedTechnicianId = row.assigned_technician_id ? String(row.assigned_technician_id) : null;
    let technicianLabel: string | null = null;
    if (assignedTechnicianId) {
      const tech = await prisma.profile.findFirst({
        where: { id: assignedTechnicianId, organizationId: params.organizationId },
        select: { id: true, fullName: true, email: true },
      });
      technicianLabel = tech?.id ? String(tech.fullName || tech.email || tech.id) : null;
    }

    const stockSourceHolderIdRaw = row.stock_source_holder_id ? String(row.stock_source_holder_id) : null;
    let stockSourceHolderId: string | null = stockSourceHolderIdRaw;
    if (!stockSourceHolderId) {
      stockSourceHolderId = assignedTechnicianId
        ? await resolveDefaultOperationsStockSourceHolderIdForTechnician({
            organizationId: params.organizationId,
            technicianId: assignedTechnicianId,
          })
        : await ensureOperationsPrimaryWarehouseHolderId({ organizationId: params.organizationId });

      await orgExec(
        prisma,
        params.organizationId,
        `
          UPDATE operations_work_orders
          SET stock_source_holder_id = $1::uuid
          WHERE id = $2::uuid
            AND organization_id = $3::uuid
            AND stock_source_holder_id IS NULL
        `,
        [stockSourceHolderId, id, params.organizationId]
      );
    }

    const stockSourceLabel = stockSourceHolderId
      ? await resolveOperationsStockHolderLabel({ organizationId: params.organizationId, holderId: stockSourceHolderId })
      : null;

    const ttlSeconds = 60 * 60;
    const completionSignatureUrlResolved = await resolveStorageUrlMaybe(
      row.completion_signature_url ? String(row.completion_signature_url) : null,
      ttlSeconds,
      { organizationId: params.organizationId, orgSlug: params.orgSlug || null }
    );

    return {
      success: true,
      data: {
        id: String(row.id),
        title: String(row.title),
        description: row.description === null || row.description === undefined ? null : String(row.description),
        status: String(row.status) as OperationsWorkOrderStatus,
        scheduledStart: row.scheduled_start ? toIsoDate(row.scheduled_start) : null,
        installationAddress: row.installation_address ? String(row.installation_address) : null,
        project: { id: String(row.project_id), title: String(row.project_title) },
        assignedTechnicianId,
        technicianLabel,
        stockSourceHolderId,
        stockSourceLabel,
        completionSignatureUrl:
          completionSignatureUrlResolved || (row.completion_signature_url ? String(row.completion_signature_url) : null),
        createdAt: toIsoDate(row.created_at) ?? new Date().toISOString(),
        updatedAt: toIsoDate(row.updated_at) ?? new Date().toISOString(),
      },
    };
  } catch (e: unknown) {
    console.error('[operations] getOperationsWorkOrderById failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאה' };
  }
}

async function setOperationsWorkOrderStatusForOrganizationId(params: {
  organizationId: string;
  id: string;
  status: OperationsWorkOrderStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    const status = String(params.status || '').trim() as OperationsWorkOrderStatus;

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };
    if (status !== 'NEW' && status !== 'IN_PROGRESS' && status !== 'DONE') {
      return { success: false, error: 'סטטוס לא חוקי' };
    }

    await prisma.operationsWorkOrder.updateMany({
      where: { id, organizationId: params.organizationId },
      data: { status },
    });

    return { success: true };
  } catch (e: unknown) {
    console.error('[operations] setOperationsWorkOrderStatus failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס קריאה' };
  }
}

export {
  setOperationsWorkOrderCompletionSignatureForOrganizationId,
  setOperationsWorkOrderCompletionSignatureUnsafe,
} from '@/lib/services/operations/work-orders/signatures';
export {
  addOperationsWorkOrderAttachmentForOrganizationId,
  getOperationsWorkOrderAttachmentsForOrganizationId,
} from '@/lib/services/operations/work-orders/attachments';
export {
  addOperationsWorkOrderCheckinForOrganizationId,
  getOperationsWorkOrderCheckinsForOrganizationId,
} from '@/lib/services/operations/work-orders/checkins';
export { setOperationsWorkOrderAssignedTechnicianForOrganizationId } from '@/lib/services/operations/work-orders/assignment';
export { getOperationsWorkOrdersDataForOrganizationId } from '@/lib/services/operations/work-orders/list';
export { createOperationsWorkOrderForOrganizationId } from '@/lib/services/operations/work-orders/create';
export { getOperationsWorkOrderByIdForOrganizationId } from '@/lib/services/operations/work-orders/get-by-id';
export { setOperationsWorkOrderStatusForOrganizationId } from '@/lib/services/operations/work-orders/status';
