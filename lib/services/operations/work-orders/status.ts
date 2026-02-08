import 'server-only';

import { prisma } from '@/lib/services/operations/db';
import {
  ALLOW_SCHEMA_FALLBACKS,
  getUnknownErrorMessage,
  isSchemaMismatchError,
  logOperationsError,
} from '@/lib/services/operations/shared';
import type { OperationsWorkOrderStatus } from '@/lib/services/operations/types';

export async function setOperationsWorkOrderStatusForOrganizationId(params: {
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
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] operations_work_orders missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`);
    }
    logOperationsError('[operations] setOperationsWorkOrderStatus failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון סטטוס קריאה' };
  }
}
