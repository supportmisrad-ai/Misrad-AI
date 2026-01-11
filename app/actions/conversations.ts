'use server';

import { createClient } from '@/lib/supabase';
import { Conversation } from '@/types/social';

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

    let query = supabase
      .from('social_conversations')
      .select(`
        *,
        social_messages (*)
      `)
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

