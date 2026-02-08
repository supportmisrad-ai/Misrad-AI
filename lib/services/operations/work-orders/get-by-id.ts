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
import { resolveStorageUrlMaybe } from '@/lib/services/operations/storage';
import {
  ensureOperationsPrimaryWarehouseHolderId,
  resolveDefaultOperationsStockSourceHolderIdForTechnician,
  resolveOperationsStockHolderLabel,
} from '@/lib/services/operations/stock-holders';
import type { OperationsWorkOrderStatus } from '@/lib/services/operations/types';

export async function getOperationsWorkOrderByIdForOrganizationId(params: {
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
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] operations_work_orders missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`);
    }
    logOperationsError('[operations] getOperationsWorkOrderById failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאה' };
  }
}
