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
import type { OperationsWorkOrderCheckinRow } from '@/lib/services/operations/types';

export async function getOperationsWorkOrderCheckinsForOrganizationId(params: {
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
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] operations_work_order_checkins missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`
      );
    }
    logOperationsError('[operations] getOperationsWorkOrderCheckins failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת Check-In לקריאה' };
  }
}

export async function addOperationsWorkOrderCheckinForOrganizationId(params: {
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
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(
        `[SchemaMismatch] operations_work_order_checkins missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`
      );
    }
    logOperationsError('[operations] addOperationsWorkOrderCheckin failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת Check-In' };
  }
}
