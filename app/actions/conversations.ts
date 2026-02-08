'use server';

import { Conversation } from '@/types/social';
import type { SocialPlatform } from '@/types/social';
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
        messages: (Array.isArray(conv.social_messages) ? conv.social_messages : []).map((msg) => ({
          id: String(msg.id),
          sender: String(msg.sender ?? ''),
          text: String(msg.text ?? ''),
          timestamp: toIsoString(msg.created_at),
          isMe: Boolean(msg.is_me ?? false),
        })),
      };
    });

    return {
      success: true,
      data: conversations,
    };
  } catch (error: unknown) {
    console.error('Error in getConversations:', error);
    return {
      success: false,
      error: getErrorMessage(error) || 'שגיאה בטעינת שיחות',
    };
  }
}

