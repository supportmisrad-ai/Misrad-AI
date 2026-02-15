import 'server-only';

import { orgExec, orgQuery } from '@/lib/services/operations/db';
import { prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate } from '@/lib/services/operations/shared';
import type { OperationsSupplierRow } from '@/lib/services/operations/types';

export async function getOperationsSuppliersByOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsSupplierRow[]; error?: string }> {
  try {
    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text, name, contact_name, phone, email, notes, created_at
        FROM operations_suppliers
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
          contactName: obj.contact_name ? String(obj.contact_name) : null,
          phone: obj.phone ? String(obj.phone) : null,
          email: obj.email ? String(obj.email) : null,
          notes: obj.notes ? String(obj.notes) : null,
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsSuppliers failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת ספקים' };
  }
}

export async function createOperationsSupplierForOrganizationId(params: {
  organizationId: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const name = String(params.name || '').trim();
    if (!name) return { success: false, error: 'חובה להזין שם ספק' };

    const created = await prisma.operationsSupplier.create({
      data: {
        organizationId: params.organizationId,
        name,
        contactName: params.contactName ? String(params.contactName).trim() : null,
        phone: params.phone ? String(params.phone).trim() : null,
        email: params.email ? String(params.email).trim() : null,
        notes: params.notes ? String(params.notes).trim() : null,
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsSupplier failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה ביצירת ספק' };
  }
}

export async function deleteOperationsSupplierForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה ספק' };

    await orgExec(
      prisma,
      params.organizationId,
      `DELETE FROM operations_suppliers WHERE organization_id = $1::uuid AND id = $2::uuid`,
      [params.organizationId, id]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsSupplier failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת ספק' };
  }
}
