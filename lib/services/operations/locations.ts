import 'server-only';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate } from '@/lib/services/operations/shared';
import type { OperationsLocationRow } from '@/lib/services/operations/types';

export async function getOperationsLocationsByOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsLocationRow[]; error?: string }> {
  try {
    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text as id, name, created_at
        FROM operations_locations
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
    logOperationsError('[operations] getOperationsLocations failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מחסנים' };
  }
}

export async function createOperationsLocationForOrganizationId(params: {
  organizationId: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם מחסן' };

    await orgExec(
      prisma,
      params.organizationId,
      `INSERT INTO operations_locations (organization_id, name) VALUES ($1::uuid, $2::text)`,
      [params.organizationId, name]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsLocation failed', e);
    const msg = String(getUnknownErrorMessage(e) || '');
    if (msg.toLowerCase().includes('uq_operations_locations_org_name')) {
      return { success: false, error: 'מחסן בשם הזה כבר קיים' };
    }
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת מחסן' };
  }
}

export async function deleteOperationsLocationForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה מחסן' };

    await orgExec(
      prisma,
      params.organizationId,
      `DELETE FROM operations_locations WHERE organization_id = $1::uuid AND id = $2::uuid`,
      [params.organizationId, id]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsLocation failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת מחסן' };
  }
}
