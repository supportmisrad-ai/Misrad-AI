import 'server-only';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate } from '@/lib/services/operations/shared';
import type { OperationsCallCategoryRow } from '@/lib/services/operations/types';

export async function getOperationsCallCategoriesByOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsCallCategoryRow[]; error?: string }> {
  try {
    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text, name, color, icon, max_response_minutes, sort_order, is_active, created_at
        FROM operations_call_categories
        WHERE organization_id = $1::uuid
        ORDER BY sort_order ASC, name ASC
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
          color: obj.color ? String(obj.color) : null,
          icon: obj.icon ? String(obj.icon) : null,
          maxResponseMinutes: typeof obj.max_response_minutes === 'number' ? obj.max_response_minutes : null,
          sortOrder: typeof obj.sort_order === 'number' ? obj.sort_order : 0,
          isActive: obj.is_active !== false,
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsCallCategories failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת קטגוריות' };
  }
}

export async function createOperationsCallCategoryForOrganizationId(params: {
  organizationId: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  maxResponseMinutes?: number | null;
  sortOrder?: number;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם קטגוריה' };

    const created = await prisma.operationsCallCategory.create({
      data: {
        organizationId: params.organizationId,
        name,
        color: params.color ? String(params.color).trim() : null,
        icon: params.icon ? String(params.icon).trim() : null,
        maxResponseMinutes: typeof params.maxResponseMinutes === 'number' ? params.maxResponseMinutes : null,
        sortOrder: typeof params.sortOrder === 'number' ? params.sortOrder : 0,
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsCallCategory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת קטגוריה' };
  }
}

export async function updateOperationsCallCategoryForOrganizationId(params: {
  organizationId: string;
  id: string;
  name?: string;
  color?: string | null;
  icon?: string | null;
  maxResponseMinutes?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה קטגוריה' };

    const updates: string[] = [];
    const values: unknown[] = [params.organizationId, id];
    let idx = 3;

    if (params.name !== undefined) {
      const name = String(params.name || '').trim();
      if (!name) return { success: false, error: 'חובה להזין שם קטגוריה' };
      updates.push(`name = $${idx}::text`);
      values.push(name);
      idx++;
    }
    if (params.color !== undefined) {
      updates.push(`color = $${idx}::text`);
      values.push(params.color ? String(params.color).trim() : null);
      idx++;
    }
    if (params.icon !== undefined) {
      updates.push(`icon = $${idx}::text`);
      values.push(params.icon ? String(params.icon).trim() : null);
      idx++;
    }
    if (params.maxResponseMinutes !== undefined) {
      updates.push(`max_response_minutes = $${idx}::integer`);
      values.push(params.maxResponseMinutes);
      idx++;
    }
    if (params.sortOrder !== undefined) {
      updates.push(`sort_order = $${idx}::integer`);
      values.push(params.sortOrder);
      idx++;
    }
    if (params.isActive !== undefined) {
      updates.push(`is_active = $${idx}::boolean`);
      values.push(params.isActive);
      idx++;
    }

    if (updates.length === 0) return { success: true };

    await orgExec(
      prisma,
      params.organizationId,
      `UPDATE operations_call_categories SET ${updates.join(', ')} WHERE organization_id = $1::uuid AND id = $2::uuid`,
      values
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] updateOperationsCallCategory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון קטגוריה' };
  }
}

export async function deleteOperationsCallCategoryForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה קטגוריה' };

    await orgExec(
      prisma,
      params.organizationId,
      `DELETE FROM operations_call_categories WHERE organization_id = $1::uuid AND id = $2::uuid`,
      [params.organizationId, id]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsCallCategory failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת קטגוריה' };
  }
}
