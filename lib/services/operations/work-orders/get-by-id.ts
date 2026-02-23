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
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';
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
          COALESCE(wo.priority, 'NORMAL') as priority,
          wo.scheduled_start as scheduled_start,
          wo.installation_address as installation_address,
          wo.stock_source_holder_id::text as stock_source_holder_id,
          wo.completion_signature_url as completion_signature_url,
          wo.created_at as created_at,
          wo.updated_at as updated_at,
          wo.project_id::text as project_id,
          p.title as project_title,
          wo.assigned_technician_id::text as assigned_technician_id,
          wo.category_id::text as category_id,
          cat.name as category_name,
          wo.department_id::text as department_id,
          dept.name as department_name,
          wo.building_id::text as building_id,
          bld.name as building_name,
          wo.floor as floor,
          wo.unit as unit,
          wo.reporter_name as reporter_name,
          wo.reporter_phone as reporter_phone,
          wo.sla_deadline as sla_deadline,
          wo.completed_at as completed_at,
          wo.ai_summary as ai_summary
        FROM operations_work_orders wo
        LEFT JOIN operations_projects p
          ON p.id = wo.project_id
        LEFT JOIN operations_call_categories cat
          ON cat.id = wo.category_id
        LEFT JOIN operations_departments dept
          ON dept.id = wo.department_id
        LEFT JOIN operations_buildings bld
          ON bld.id = wo.building_id
        WHERE wo.organization_id = $1::uuid
          AND wo.id = $2::uuid
        LIMIT 1
      `,
      [params.organizationId, id]
    );

    const row = asObject((rows || [])[0]);
    if (!row?.id) return { success: false, error: 'קריאה לא נמצאה' };

    const assignedTechnicianId = row.assigned_technician_id ? String(row.assigned_technician_id) : null;
    const ttlSeconds = 60 * 60;

    // Phase 2: Technician label + signature URL + stock source holder — all independent, run in parallel
    const stockSourceHolderIdRaw = row.stock_source_holder_id ? String(row.stock_source_holder_id) : null;
    const needsStockResolve = !stockSourceHolderIdRaw;

    const [techResult, completionSignatureUrlResolved, resolvedStockHolderId] = await Promise.all([
      assignedTechnicianId
        ? prisma.profile.findFirst({
            where: { id: assignedTechnicianId, organizationId: params.organizationId },
            select: { id: true, fullName: true, email: true },
          })
        : Promise.resolve(null),
      resolveStorageUrlMaybe(
        row.completion_signature_url ? String(row.completion_signature_url) : null,
        ttlSeconds,
        { organizationId: params.organizationId, orgSlug: params.orgSlug || null }
      ),
      needsStockResolve
        ? (assignedTechnicianId
            ? resolveDefaultOperationsStockSourceHolderIdForTechnician({
                organizationId: params.organizationId,
                technicianId: assignedTechnicianId,
              })
            : ensureOperationsPrimaryWarehouseHolderId({ organizationId: params.organizationId })
          ).catch(() => null as string | null)
        : Promise.resolve(stockSourceHolderIdRaw),
    ]);
    const technicianLabel = techResult?.id ? String(techResult.fullName || techResult.email || techResult.id) : null;
    const stockSourceHolderId: string | null = resolvedStockHolderId ?? stockSourceHolderIdRaw;

    // Fire-and-forget: persist resolved stock source (non-blocking)
    if (needsStockResolve && stockSourceHolderId) {
      orgExec(
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
      ).catch(() => undefined);
    }

    // Phase 3: Stock source label (needs holderId from Phase 2)
    const stockSourceLabel = stockSourceHolderId
      ? await resolveOperationsStockHolderLabel({ organizationId: params.organizationId, holderId: stockSourceHolderId })
      : null;

    return {
      success: true,
      data: {
        id: String(row.id),
        title: String(row.title),
        description: row.description === null || row.description === undefined ? null : String(row.description),
        status: String(row.status) as OperationsWorkOrderStatus,
        priority: String(row.priority ?? 'NORMAL'),
        scheduledStart: row.scheduled_start ? toIsoDate(row.scheduled_start) : null,
        installationAddress: row.installation_address ? String(row.installation_address) : null,
        project: row.project_id ? { id: String(row.project_id), title: String(row.project_title ?? '') } : null,
        assignedTechnicianId,
        technicianLabel,
        stockSourceHolderId,
        stockSourceLabel,
        completionSignatureUrl:
          completionSignatureUrlResolved || (row.completion_signature_url ? String(row.completion_signature_url) : null),
        categoryId: row.category_id ? String(row.category_id) : null,
        categoryName: row.category_name ? String(row.category_name) : null,
        departmentId: row.department_id ? String(row.department_id) : null,
        departmentName: row.department_name ? String(row.department_name) : null,
        buildingId: row.building_id ? String(row.building_id) : null,
        buildingName: row.building_name ? String(row.building_name) : null,
        floor: row.floor ? String(row.floor) : null,
        unit: row.unit ? String(row.unit) : null,
        reporterName: row.reporter_name ? String(row.reporter_name) : null,
        reporterPhone: row.reporter_phone ? String(row.reporter_phone) : null,
        slaDeadline: row.sla_deadline ? toIsoDate(row.sla_deadline) : null,
        completedAt: row.completed_at ? toIsoDate(row.completed_at) : null,
        aiSummary: row.ai_summary ? String(row.ai_summary) : null,
        createdAt: toIsoDate(row.created_at) ?? new Date().toISOString(),
        updatedAt: toIsoDate(row.updated_at) ?? new Date().toISOString(),
      },
    };
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] operations_work_orders missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'lib/services/operations/work-orders/get-by-id.getOperationsWorkOrderByIdForOrganizationId',
        reason: 'operations_work_orders schema mismatch (fallback to error response)',
        error: e,
        extras: { organizationId: String(params.organizationId), id: String(params.id || '') },
      });
    }
    logOperationsError('[operations] getOperationsWorkOrderById failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הקריאה' };
  }
}
