'use server';


import { logger } from '@/lib/server/logger';
import type { Conversation, Message, SocialPlatform } from '@/types/social';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { getErrorMessage } from '@/lib/server/workspace-access/utils';

const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'tiktok',
  'twitter',
  'google',
  'whatsapp',
  'threads',
  'youtube',
  'pinterest',
  'portal',
] as const;

function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === 'string' && (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

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

    const rows = await prisma.socialMediaConversation.findMany({
      where: {
        organizationId: String(organizationId),
        ...(clientId ? { client_id: String(clientId) } : {}),
      },
      orderBy: { updated_at: 'desc' },
    });

    const conversations: Conversation[] = (Array.isArray(rows) ? rows : []).map((conv) => {
      const platform: SocialPlatform = isSocialPlatform(conv.platform) ? conv.platform : 'portal';
      return {
        id: String(conv.id),
        clientId: String(conv.client_id),
        platform,
        userName: String(conv.user_name ?? ''),
        userAvatar: conv.user_avatar == null ? '' : String(conv.user_avatar),
        lastMessage: conv.last_message == null ? '' : String(conv.last_message),
        timestamp: toIsoString(conv.updated_at ?? conv.created_at),
        unreadCount: Number(conv.unread_count ?? 0) || 0,
        messages: [],
      };
    });

    return {
      success: true,
      data: conversations,
    };
  } catch (error: unknown) {
    logger.error('conversations', 'Error in getConversations:', error);
    return {
      success: false,
      error: getErrorMessage(error) || 'שגיאה בטעינת שיחות',
    };
  }
}

/**
 * Server Action: Get messages for a specific conversation
 */
export async function getMessages(
  orgSlug: string,
  conversationId: string
): Promise<{ success: boolean; data?: Message[]; error?: string }> {
  try {
    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    // Verify conversation belongs to this org
    const conversation = await prisma.socialMediaConversation.findFirst({
      where: { id: String(conversationId), organizationId: String(organizationId) },
      select: { id: true },
    });
    if (!conversation) {
      return { success: false, error: 'שיחה לא נמצאה' };
    }

    const rows = await prisma.socialMediaMessage.findMany({
      where: {
        conversation_id: String(conversationId),
        organizationId: String(organizationId),
      },
      orderBy: { created_at: 'asc' },
    });

    const messages: Message[] = (Array.isArray(rows) ? rows : []).map((msg) => ({
      id: String(msg.id),
      sender: String(msg.sender ?? ''),
      text: String(msg.text ?? ''),
      timestamp: toIsoString(msg.created_at),
      isMe: Boolean(msg.is_me),
    }));

    return { success: true, data: messages };
  } catch (error: unknown) {
    logger.error('conversations', 'Error in getMessages:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה בטעינת הודעות' };
  }
}

/**
 * Server Action: Send a message in a conversation
 */
export async function sendMessage(
  orgSlug: string,
  conversationId: string,
  text: string
): Promise<{ success: boolean; data?: Message; error?: string }> {
  try {
    const trimmed = String(text || '').trim();
    if (!trimmed) {
      return { success: false, error: 'הודעה ריקה' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    // Verify conversation belongs to this org
    const conversation = await prisma.socialMediaConversation.findFirst({
      where: { id: String(conversationId), organizationId: String(organizationId) },
      select: { id: true },
    });
    if (!conversation) {
      return { success: false, error: 'שיחה לא נמצאה' };
    }

    const created = await prisma.socialMediaMessage.create({
      data: {
        organizationId: String(organizationId),
        conversation_id: String(conversationId),
        sender: 'me',
        text: trimmed,
        is_me: true,
      },
    });

    // Update conversation's last_message and updated_at
    await prisma.socialMediaConversation.update({
      where: { id: String(conversationId) },
      data: {
        last_message: trimmed.length > 200 ? trimmed.slice(0, 200) + '…' : trimmed,
        updated_at: new Date(),
      },
    });

    const message: Message = {
      id: String(created.id),
      sender: String(created.sender),
      text: String(created.text),
      timestamp: toIsoString(created.created_at),
      isMe: true,
    };

    return { success: true, data: message };
  } catch (error: unknown) {
    logger.error('conversations', 'Error in sendMessage:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה בשליחת הודעה' };
  }
}

/**
 * Server Action: Mark a conversation as read (reset unread count)
 */
export async function markConversationAsRead(
  orgSlug: string,
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const conversation = await prisma.socialMediaConversation.findFirst({
      where: { id: String(conversationId), organizationId: String(organizationId) },
      select: { id: true, unread_count: true },
    });
    if (!conversation) {
      return { success: false, error: 'שיחה לא נמצאה' };
    }

    if ((conversation.unread_count ?? 0) > 0) {
      await prisma.socialMediaConversation.update({
        where: { id: String(conversationId) },
        data: { unread_count: 0 },
      });
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('conversations', 'Error in markConversationAsRead:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה בסימון כנקרא' };
  }
}

/**
 * Server Action: Create a new conversation
 */
export async function createConversation(
  orgSlug: string,
  clientId: string,
  userName: string,
  platform: string
): Promise<{ success: boolean; data?: Conversation; error?: string }> {
  try {
    const resolvedUserName = String(userName || '').trim();
    if (!resolvedUserName) {
      return { success: false, error: 'שם נדרש' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const resolvedPlatform: SocialPlatform = isSocialPlatform(platform) ? platform : 'portal';

    const created = await prisma.socialMediaConversation.create({
      data: {
        organizationId: String(organizationId),
        client_id: String(clientId),
        platform: resolvedPlatform,
        user_name: resolvedUserName,
        user_avatar: null,
        last_message: null,
        unread_count: 0,
      },
    });

    const conversation: Conversation = {
      id: String(created.id),
      clientId: String(created.client_id),
      platform: resolvedPlatform,
      userName: String(created.user_name),
      userAvatar: '',
      lastMessage: '',
      timestamp: toIsoString(created.created_at),
      unreadCount: 0,
      messages: [],
    };

    return { success: true, data: conversation };
  } catch (error: unknown) {
    logger.error('conversations', 'Error in createConversation:', error);
    return { success: false, error: getErrorMessage(error) || 'שגיאה ביצירת שיחה' };
  }
}
