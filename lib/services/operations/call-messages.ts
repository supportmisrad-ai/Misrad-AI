import 'server-only';

import { orgQuery, orgExec, prisma } from '@/lib/services/operations/db';
import { asObject, getUnknownErrorMessage, logOperationsError, toIsoDate } from '@/lib/services/operations/shared';
import type { OperationsCallMessageRow } from '@/lib/services/operations/types';

export async function getOperationsCallMessagesByWorkOrderId(params: {
  organizationId: string;
  workOrderId: string;
}): Promise<{ success: boolean; data?: OperationsCallMessageRow[]; error?: string }> {
  try {
    const rows = await orgQuery<unknown[]>(
      prisma,
      params.organizationId,
      `
        SELECT id::text, author_id::text, author_name, content,
               attachment_url, attachment_type, mentions, created_at
        FROM operations_call_messages
        WHERE organization_id = $1::uuid AND work_order_id = $2::uuid
        ORDER BY created_at ASC
      `,
      [params.organizationId, params.workOrderId]
    );

    return {
      success: true,
      data: (rows || []).map((r) => {
        const obj = asObject(r) ?? {};
        const rawMentions = obj.mentions;
        const mentions = Array.isArray(rawMentions) ? rawMentions.map(String) : [];
        return {
          id: String(obj.id ?? ''),
          authorId: String(obj.author_id ?? ''),
          authorName: String(obj.author_name ?? ''),
          content: String(obj.content ?? ''),
          attachmentUrl: obj.attachment_url ? String(obj.attachment_url) : null,
          attachmentType: obj.attachment_type ? String(obj.attachment_type) : null,
          mentions,
          createdAt: toIsoDate(obj.created_at) ?? new Date().toISOString(),
        };
      }),
    };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsCallMessages failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הודעות' };
  }
}

export async function createOperationsCallMessageForOrganizationId(params: {
  organizationId: string;
  workOrderId: string;
  authorId: string;
  authorName: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  mentions?: string[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const content = String(params.content || '').trim();
    const hasAttachment = !!params.attachmentUrl;
    if (!content && !hasAttachment) return { success: false, error: 'חובה להזין תוכן הודעה או לצרף קובץ' };

    const created = await prisma.operationsCallMessage.create({
      data: {
        organizationId: params.organizationId,
        workOrderId: params.workOrderId,
        authorId: params.authorId,
        authorName: String(params.authorName || '').trim(),
        content: content || '',
        attachmentUrl: params.attachmentUrl || null,
        attachmentType: params.attachmentType || null,
        mentions: Array.isArray(params.mentions) ? params.mentions : [],
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: unknown) {
    logOperationsError('[operations] createOperationsCallMessage failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בשליחת הודעה' };
  }
}

export async function updateOperationsCallMessageForOrganizationId(params: {
  organizationId: string;
  messageId: string;
  authorId: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const content = String(params.content || '').trim();
    if (!content) return { success: false, error: 'חובה להזין תוכן הודעה' };

    await orgExec(
      prisma,
      params.organizationId,
      `
        UPDATE operations_call_messages
        SET content = $1
        WHERE id = $2::uuid
          AND organization_id = $3::uuid
          AND author_id = $4::uuid
      `,
      [content, params.messageId, params.organizationId, params.authorId]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] updateOperationsCallMessage failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון הודעה' };
  }
}

export async function deleteOperationsCallMessageForOrganizationId(params: {
  organizationId: string;
  messageId: string;
  authorId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await orgExec(
      prisma,
      params.organizationId,
      `
        DELETE FROM operations_call_messages
        WHERE id = $1::uuid
          AND organization_id = $2::uuid
          AND author_id = $3::uuid
      `,
      [params.messageId, params.organizationId, params.authorId]
    );

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] deleteOperationsCallMessage failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה במחיקת הודעה' };
  }
}
