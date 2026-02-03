'use server';

import { Conversation } from '@/types/social';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

async function resolveOrganizationIdForCurrentUser(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const row = await prisma.social_users.findUnique({
      where: { clerk_user_id: String(userId) },
      select: { organization_id: true },
    });
    const orgId = (row as any)?.organization_id;
    return orgId ? String(orgId) : null;
  } catch {
    return null;
  }
}

/**
 * Server Action: Get all conversations
 */
export async function getConversations(clientId?: string): Promise<{ success: boolean; data?: Conversation[]; error?: string }> {
  try {
    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: true, data: [] };
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

