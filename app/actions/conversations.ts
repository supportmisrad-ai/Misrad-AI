'use server';

import { createClient } from '@/lib/supabase';
import { Conversation } from '@/types/social';
import { auth } from '@clerk/nextjs/server';

async function resolveOrganizationIdForCurrentUser(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('social_users')
      .select('organization_id')
      .eq('clerk_user_id', String(userId))
      .maybeSingle();
    const orgId = (data as any)?.organization_id;
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
    let supabase;
    try {
      supabase = createClient();
    } catch (clientError: any) {
      console.error('[getConversations] Failed to create Supabase client:', clientError);
      return {
        success: false,
        error: `שגיאה בהתחברות למסד הנתונים: ${clientError.message}`,
      };
    }

    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: true, data: [] };
    }

    let query = supabase
      .from('social_conversations')
      .select(`
        *,
        social_messages (*)
      `)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const conversations: Conversation[] = (data || []).map((conv: any) => ({
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
        content: msg.content,
        sender: msg.sender as any,
        timestamp: msg.created_at,
        attachments: msg.attachments || [],
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

