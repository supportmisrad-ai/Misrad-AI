import 'server-only';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate } from '@/lib/services/operations/shared';
import type { OperationsWorkOrderTypeRow } from '@/lib/services/operations/types';

export async function getOperationsWorkOrderTypesByOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsWorkOrderTypeRow[]; error?: string }> {
  try {
    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text as id, name, created_at
        FROM operations_work_order_types
        WHERE organization_id = $1::uuid
        ORDER BY created_at DESC
      `,
      [params.organizationId]
    );

    return {
      success: true,
      data: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        return {
          id: String(obj.id ?? ''),
          name: String(obj.name ?? ''),
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsWorkOrderTypes failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת סוגי קריאות' };
  }
}

export async function createOperationsWorkOrderTypeForOrganizationId(params: {
  organizationId: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם סוג קריאה' };

    await orgExec(
      prisma,
      params.organizationId,
      `INSERT INTO operations_work_order_types (organization_id, name) VALUES ($1::uuid, $2::text)`,
      [params.organizationId, name]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsWorkOrderType failed', e);
    const msg = String(getUnknownErrorMessage(e) || '');
    if (msg.toLowerCase().includes('uq_operations_work_order_types_org_name')) {
      return { success: false, error: 'סוג קריאה בשם הזה כבר קיים' };
    }
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת סוג קריאה' };
  }
}

export async function deleteOperationsWorkOrderTypeForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה סוג קריאה' };

    await orgExec(
      prisma,
      params.organizationId,
      `DELETE FROM operations_work_order_types WHERE organization_id = $1::uuid AND id = $2::uuid`,
      [params.organizationId, id]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsWorkOrderType failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת סוג קריאה' };
  }
}
