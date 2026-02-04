'use server';

import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { headers } from 'next/headers';

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
    const orgSlug = headersList.get('x-org-id') || '';
    
    if (!orgSlug) {
      return { success: false, error: 'No organization context - missing x-org-id header' };
    }

    // קבלת organization_id בפועל
    const org = await prisma.social_organizations.findFirst({
      where: {
        OR: [
          { id: orgSlug },
          { slug: orgSlug }
        ]
      },
      select: { id: true }
    });

    if (!org?.id) {
      return { success: false, error: 'Organization not found' };
    }

    const organizationId = String(org.id);

    // שמירה/עדכון עם tenant isolation
    await prisma.$executeRawUnsafe(`
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
      organizationId,
      userId,
      params.moduleKey,
      params.chatSessionId,
      params.title,
      params.preview,
      JSON.stringify(params.messages),
      params.messages.length
    );

    return { success: true };
  } catch (error) {
    console.error('Error saving chat history:', error);
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
    const orgSlug = headersList.get('x-org-id') || '';
    
    if (!orgSlug) {
      return { success: false, error: 'No organization context - missing x-org-id header', data: [] };
    }

    // קבלת organization_id בפועל
    const org = await prisma.social_organizations.findFirst({
      where: {
        OR: [
          { id: orgSlug },
          { slug: orgSlug }
        ]
      },
      select: { id: true }
    });

    if (!org?.id) {
      return { success: false, error: 'Organization not found', data: [] };
    }

    const organizationId = String(org.id);
    const limit = params.limit || 20;

    // שאילתה עם tenant isolation מלא: organization + user + module
    const history = await prisma.$queryRawUnsafe<any[]>(`
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
      organizationId,
      userId,
      params.moduleKey,
      limit
    );

    return {
      success: true,
      data: history.map(h => ({
        id: String(h.chat_session_id),
        title: String(h.title),
        preview: String(h.preview || ''),
        timestamp: new Date(h.updated_at).getTime(),
        messagesCount: Number(h.messages_count || 0),
        messages: h.messages || []
      }))
    };
  } catch (error) {
    console.error('Error getting chat history:', error);
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
    const orgSlug = headersList.get('x-org-id') || '';
    
    if (!orgSlug) {
      return { success: false, error: 'No organization context - missing x-org-id header' };
    }

    const org = await prisma.social_organizations.findFirst({
      where: {
        OR: [
          { id: orgSlug },
          { slug: orgSlug }
        ]
      },
      select: { id: true }
    });

    if (!org?.id) {
      return { success: false, error: 'Organization not found' };
    }

    const organizationId = String(org.id);

    // מחיקה רק אם זה של המשתמש + הארגון + המודול
    await prisma.$executeRawUnsafe(`
      DELETE FROM module_chat_history
      WHERE organization_id = $1
        AND user_id = $2
        AND module_key = $3
        AND chat_session_id = $4
    `,
      organizationId,
      userId,
      params.moduleKey,
      params.chatSessionId
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting chat history:', error);
    return { success: false, error: String(error) };
  }
}
