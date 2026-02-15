import 'server-only';

import { orgExec, orgQuery } from '@/lib/services/operations/db';
import { prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate } from '@/lib/services/operations/shared';
import type { OperationsBuildingRow } from '@/lib/services/operations/types';

export async function getOperationsBuildingsByOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsBuildingRow[]; error?: string }> {
  try {
    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text, name, address, floors, notes, created_at
        FROM operations_buildings
        WHERE organization_id = $1::uuid
        ORDER BY name ASC
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
          address: obj.address ? String(obj.address) : null,
          floors: typeof obj.floors === 'number' ? obj.floors : null,
          notes: obj.notes ? String(obj.notes) : null,
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsBuildings failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מבנים' };
  }
}

export async function createOperationsBuildingForOrganizationId(params: {
  organizationId: string;
  name: string;
  address?: string | null;
  floors?: number | null;
  notes?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם מבנה' };

    const created = await prisma.operationsBuilding.create({
      data: {
        organizationId: params.organizationId,
        name,
        address: params.address ? String(params.address).trim() : null,
        floors: typeof params.floors === 'number' ? params.floors : null,
        notes: params.notes ? String(params.notes).trim() : null,
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsBuilding failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת מבנה' };
  }
}

export async function updateOperationsBuildingForOrganizationId(params: {
  organizationId: string;
  id: string;
  name?: string;
  address?: string | null;
  floors?: number | null;
  notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה מבנה' };

    const updates: string[] = [];
    const values: unknown[] = [params.organizationId, id];
    let idx = 3;

    if (params.name !== undefined) {
      const name = String(params.name || '').trim();
      if (!name) return { success: false, error: 'חובה להזין שם מבנה' };
      updates.push(`name = $${idx}::text`);
      values.push(name);
      idx++;
    }
    if (params.address !== undefined) {
      updates.push(`address = $${idx}::text`);
      values.push(params.address ? String(params.address).trim() : null);
      idx++;
    }
    if (params.floors !== undefined) {
      updates.push(`floors = $${idx}::integer`);
      values.push(params.floors);
      idx++;
    }
    if (params.notes !== undefined) {
      updates.push(`notes = $${idx}::text`);
      values.push(params.notes ? String(params.notes).trim() : null);
      idx++;
    }

    if (updates.length === 0) return { success: true };

    updates.push('updated_at = NOW()');

    await orgExec(
      prisma,
      params.organizationId,
      `UPDATE operations_buildings SET ${updates.join(', ')} WHERE organization_id = $1::uuid AND id = $2::uuid`,
      values
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] updateOperationsBuilding failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון מבנה' };
  }
}

export async function deleteOperationsBuildingForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה מבנה' };

    await orgExec(
      prisma,
      params.organizationId,
      `DELETE FROM operations_buildings WHERE organization_id = $1::uuid AND id = $2::uuid`,
      [params.organizationId, id]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsBuilding failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת מבנה' };
  }
}
