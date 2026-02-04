'use server';

import { Conversation } from '@/types/social';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

async function requireOrganizationIdForOrgSlug(orgSlug: string): Promise<string> {
  const resolvedOrgSlug = String(orgSlug || '').trim();
  if (!resolvedOrgSlug) {
    throw new Error('Missing orgSlug');
  }

  const workspace = await requireWorkspaceAccessByOrgSlugApi(resolvedOrgSlug);
  return String(workspace.id);
}

/**
 * Server Action: Get all conversations
 */
export async function getConversations(
  orgSlug: string,
  clientId?: string
): Promise<{ success: boolean; data?: Conversation[]; error?: string }> {
  try {
    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const rows = await prisma.social_conversations.findMany({
      where: {
        organizationId: String(organizationId),
        ...(clientId ? { client_id: String(clientId) } : {}),
      },
      include: {
        social_messages: {
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    const conversations: Conversation[] = (Array.isArray(rows) ? rows : []).map((conv: any) => ({
      id: conv.id,
      clientId: conv.client_id,
      platform: conv.platform as any,
      userName: conv.user_name,
      userAvatar: conv.user_avatar,
      lastMessage: conv.last_message,
      timestamp: conv.updated_at || conv.created_at,
      unreadCount: conv.unread_count || 0,
      messages: (conv.social_messages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.text,
        sender: msg.sender as any,
        timestamp: msg.created_at,
        attachments: [],
      })),
    }));

    return {
      success: true,
      data: conversations,
    };
  } catch (error: any) {
    console.error('Error in getConversations:', error);
    return {
      success: false,
      error: error.message || 'שגיאה בטעינת שיחות',
    };
  }
}

