'use server';


import { logger } from '@/lib/server/logger';
import prisma, { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';
import { headers } from 'next/headers';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type SaveChatHistoryParams = {
  moduleKey: string;
  chatSessionId: string;
  title: string;
  preview: string;
  messages: ChatMessage[];
};

type GetChatHistoryParams = {
  moduleKey: string;
  limit?: number;
};

type ModuleChatHistoryRow = {
  chat_session_id: unknown;
  title: unknown;
  preview: unknown;
  messages: unknown;
  messages_count: unknown;
  updated_at: unknown;
};

function coerceChatMessage(value: unknown, index: number): ChatMessage | null {
  const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  if (!obj) return null;

  const role = obj.role;
  if (role !== 'user' && role !== 'assistant') return null;

  const content = obj.content;
  if (typeof content !== 'string') return null;

  const id = typeof obj.id === 'string' && obj.id ? obj.id : `msg-${index}`;

  const ts = obj.timestamp;
  const timestamp =
    typeof ts === 'number' ? ts :
    typeof ts === 'string' ? Number(ts) :
    0;

  return { id, role, content, timestamp: Number.isFinite(timestamp) ? timestamp : 0 };
}

function coerceChatMessages(value: unknown): ChatMessage[] {
  const arr: unknown[] =
    Array.isArray(value) ? value :
    typeof value === 'string' ? (() => {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })() :
    [];

  return arr.map((v, i) => coerceChatMessage(v, i)).filter((v): v is ChatMessage => Boolean(v));
}

/**
 * שמירת היסטוריית צ'אט עם tenant isolation מלא
 */
export async function saveChatHistory(params: SaveChatHistoryParams) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // קבלת orgSlug מה-header (נשלח מהקליינט)
    const headersList = await headers();
    const orgKey = String(headersList.get('x-org-id') || headersList.get('x-orgid') || '').trim();
    
    if (!orgKey) {
      return { success: false, error: 'No organization context - missing x-org-id header' };
    }

    const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(orgKey);
    const organizationId = String(workspaceId);

    // שמירה/עדכון עם tenant isolation
    await executeRawOrgScoped(prisma, {
      organizationId,
      reason: 'module_chat_history_upsert',
      query: `
      INSERT INTO module_chat_history (
        organization_id,
        user_id,
        module_key,
        chat_session_id,
        title,
        preview,
        messages,
        messages_count,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
      ON CONFLICT (organization_id, user_id, module_key, chat_session_id)
      DO UPDATE SET
        title = $5,
        preview = $6,
        messages = $7,
        messages_count = $8,
        updated_at = NOW()
    `,
      values: [
        organizationId,
        userId,
        params.moduleKey,
        params.chatSessionId,
        params.title,
        params.preview,
        JSON.stringify(params.messages),
        params.messages.length,
      ],
    });

    return { success: true };
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] module_chat_history missing table/column (${getErrorMessage(error) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/chat-history.saveChatHistory',
        reason: 'module_chat_history missing table/column (fallback to error response)',
        error,
        extras: {
          moduleKey: String(params.moduleKey || ''),
          chatSessionId: String(params.chatSessionId || ''),
        },
      });
    }
    logger.error('chat-history', 'Error saving chat history:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * קבלת היסטוריה עם tenant isolation מלא
 */
export async function getChatHistory(params: GetChatHistoryParams) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated', data: [] };
    }

    // קבלת orgSlug מה-header (נשלח מהקליינט)
    const headersList = await headers();
    const orgKey = String(headersList.get('x-org-id') || headersList.get('x-orgid') || '').trim();
    
    if (!orgKey) {
      return { success: false, error: 'No organization context - missing x-org-id header', data: [] };
    }

    const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(orgKey);
    const organizationId = String(workspaceId);
    const limit = params.limit || 20;

    // שאילתה עם tenant isolation מלא: organization + user + module
    const history = await queryRawOrgScoped<ModuleChatHistoryRow[]>(prisma, {
      organizationId,
      reason: 'module_chat_history_list',
      query: `
      SELECT
        id,
        chat_session_id,
        title,
        preview,
        messages,
        messages_count,
        created_at,
        updated_at
      FROM module_chat_history
      WHERE organization_id = $1
        AND user_id = $2
        AND module_key = $3
      ORDER BY updated_at DESC
      LIMIT $4
    `,
      values: [organizationId, userId, params.moduleKey, limit],
    });

    return {
      success: true,
      data: history.map(h => ({
        id: String(h.chat_session_id),
        title: String(h.title),
        preview: String(h.preview || ''),
        timestamp: new Date(String(h.updated_at)).getTime(),
        messagesCount: Number(h.messages_count || 0),
        messages: coerceChatMessages(h.messages)
      }))
    };
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] module_chat_history missing table/column (${getErrorMessage(error) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/chat-history.getChatHistory',
        reason: 'module_chat_history missing table/column (fallback to empty list)',
        error,
        extras: {
          moduleKey: String(params.moduleKey || ''),
        },
      });
    }
    logger.error('chat-history', 'Error getting chat history:', error);
    return { success: false, error: String(error), data: [] };
  }
}

/**
 * מחיקת שיחה מההיסטוריה עם tenant isolation
 */
export async function deleteChatHistory(params: { moduleKey: string; chatSessionId: string }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // קבלת orgSlug מה-header (נשלח מהקליינט)
    const headersList = await headers();
    const orgKey = String(headersList.get('x-org-id') || headersList.get('x-orgid') || '').trim();
    
    if (!orgKey) {
      return { success: false, error: 'No organization context - missing x-org-id header' };
    }

    const { workspaceId } = await getWorkspaceByOrgKeyOrThrow(orgKey);
    const organizationId = String(workspaceId);

    // מחיקה רק אם זה של המשתמש + הארגון + המודול
    await executeRawOrgScoped(prisma, {
      organizationId,
      reason: 'module_chat_history_delete',
      query: `
      DELETE FROM module_chat_history
      WHERE organization_id = $1
        AND user_id = $2
        AND module_key = $3
        AND chat_session_id = $4
    `,
      values: [organizationId, userId, params.moduleKey, params.chatSessionId],
    });

    return { success: true };
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] module_chat_history missing table/column (${getErrorMessage(error) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'app/actions/chat-history.deleteChatHistory',
        reason: 'module_chat_history missing table/column (fallback to error response)',
        error,
        extras: {
          moduleKey: String(params.moduleKey || ''),
          chatSessionId: String(params.chatSessionId || ''),
        },
      });
    }
    logger.error('chat-history', 'Error deleting chat history:', error);
    return { success: false, error: String(error) };
  }
}
