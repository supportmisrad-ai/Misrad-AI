import 'server-only';

import { orgExec, prisma } from '@/lib/services/operations/db';
import {
  ALLOW_SCHEMA_FALLBACKS,
  getUnknownErrorMessage,
  isSchemaMismatchError,
  logOperationsError,
} from '@/lib/services/operations/shared';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';

export async function setOperationsWorkOrderCompletionSignatureUnsafe(params: {
  organizationId: string;
  workOrderId: string;
  signatureUrl: string;
}) {
  await orgExec(
    prisma,
    params.organizationId,
    `
      UPDATE operations_work_orders
      SET completion_signature_url = $3::text
      WHERE organization_id = $1::uuid
        AND id = $2::uuid
    `,
    [params.organizationId, params.workOrderId, params.signatureUrl]
  );
}

export async function setOperationsWorkOrderCompletionSignatureForOrganizationId(params: {
  organizationId: string;
  id: string;
  signatureUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    const signatureUrl = String(params.signatureUrl || '').trim();

    if (!id) return { success: false, error: 'חסר מזהה קריאה' };
    if (!signatureUrl) return { success: false, error: 'חסר URL חתימה' };

    const wo = await prisma.operationsWorkOrder.findFirst({
      where: { id, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!wo?.id) return { success: false, error: 'קריאה לא נמצאה או שאין הרשאה' };

    await setOperationsWorkOrderCompletionSignatureUnsafe({ organizationId: params.organizationId, workOrderId: id, signatureUrl });
    return { success: true };
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] operations_work_orders missing table/column (${getUnknownErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'lib/services/operations/work-orders/signatures.setOperationsWorkOrderCompletionSignatureForOrganizationId',
        reason: 'operations_work_orders schema mismatch (fallback to error response)',
        error: e,
        extras: { organizationId: String(params.organizationId), id: String(params.id || '') },
      });
    }
    logOperationsError('[operations] setOperationsWorkOrderCompletionSignature failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשמירת חתימה' };
  }
}
