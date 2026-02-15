import 'server-only';

import { orgExec, orgQuery, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate } from '@/lib/services/operations/shared';
import type { OperationsDepartmentRow } from '@/lib/services/operations/types';

function slugify(text: string): string {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0590-\u05ff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getOperationsDepartmentsByOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsDepartmentRow[]; error?: string }> {
  try {
    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text, name, slug, icon, color, is_active, created_at
        FROM operations_departments
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
          slug: String(obj.slug ?? ''),
          icon: obj.icon ? String(obj.icon) : null,
          color: obj.color ? String(obj.color) : null,
          isActive: obj.is_active !== false,
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsDepartments failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת מחלקות' };
  }
}

export async function createOperationsDepartmentForOrganizationId(params: {
  organizationId: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם מחלקה' };

    const slug = slugify(name) || `dept-${Date.now()}`;

    const created = await prisma.operationsDepartment.create({
      data: {
        organizationId: params.organizationId,
        name,
        slug,
        icon: params.icon ? String(params.icon).trim() : null,
        color: params.color ? String(params.color).trim() : null,
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsDepartment failed', e);
    const msg = String(getUnknownErrorMessage(e) || '');
    if (msg.toLowerCase().includes('unique constraint') || msg.toLowerCase().includes('uq_operations_departments_org_slug')) {
      return { success: false, error: 'מחלקה בשם הזה כבר קיימת' };
    }
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת מחלקה' };
  }
}

export async function deleteOperationsDepartmentForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה מחלקה' };

    await orgExec(
      prisma,
      params.organizationId,
      `DELETE FROM operations_departments WHERE organization_id = $1::uuid AND id = $2::uuid`,
      [params.organizationId, id]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsDepartment failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת מחלקה' };
  }
}
