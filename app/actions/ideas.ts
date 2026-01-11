'use server';

import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { auth } from '@clerk/nextjs/server';
import { Idea } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { uploadFile } from './files';

/**
 * Server Action: Get all ideas
 */
export async function getIdeas(clientId?: string): Promise<{ success: boolean; data?: Idea[]; error?: string }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('social_ideas')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ideas:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה בטעינת רעיונות'),
      };
    }

    const ideas: Idea[] = (data || []).map((idea: any) => ({
      id: idea.id,
      clientId: idea.client_id,
      text: idea.text,
      createdAt: idea.created_at,
    }));

    return { success: true, data: ideas };
  } catch (error: any) {
    console.error('Error in getIdeas:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בטעינת רעיונות'),
    };
  }
}

/**
 * Server Action: Create a new idea
 */
export async function createIdea(
  ideaData: {
    clientId: string;
    title: string;
    description: string;
    category: string;
    mediaFile?: File | Blob;
    mediaUrl?: string;
  }
): Promise<{ success: boolean; data?: Idea; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה בקבלת משתמש' };
    }
    const supabaseUserId = userResult.userId;

    const supabase = createClient();

    // Upload media file if provided
    let mediaUrl = ideaData.mediaUrl;
    if (ideaData.mediaFile) {
      const uploadResult = await uploadFile(
        ideaData.mediaFile,
        `idea-${Date.now()}.${ideaData.mediaFile.type.split('/')[1] || 'jpg'}`,
        'ideas'
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    // Insert idea
    const { data: idea, error: ideaError } = await supabase
      .from('social_ideas')
      .insert({
        client_id: ideaData.clientId,
        text: `${ideaData.title}\n\n${ideaData.description}`.trim(),
      })
      .select()
      .single();

    if (ideaError) {
      console.error('Error creating idea:', ideaError);
      return {
        success: false,
        error: translateError(ideaError.message || 'שגיאה ביצירת רעיון'),
      };
    }

    const formattedIdea: Idea = {
      id: idea.id,
      clientId: idea.client_id,
      text: idea.text,
      createdAt: idea.created_at,
    };

    return { success: true, data: formattedIdea };
  } catch (error: any) {
    console.error('Error in createIdea:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה ביצירת רעיון'),
    };
  }
}

/**
 * Server Action: Update an idea
 */
export async function updateIdea(
  ideaId: string,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    mediaFile?: File | Blob;
    mediaUrl?: string;
    status?: string;
  }
): Promise<{ success: boolean; data?: Idea; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabase = createClient();

    // Upload new media file if provided
    let mediaUrl = updates.mediaUrl;
    if (updates.mediaFile) {
      const uploadResult = await uploadFile(
        updates.mediaFile,
        `idea-${Date.now()}.${updates.mediaFile.type.split('/')[1] || 'jpg'}`,
        'ideas'
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    // Update idea
    const updateData: any = {};
    // social_ideas schema supports only `text` + timestamps.
    // We keep backward-compat: merge title/description into a single text field.
    if (updates.title !== undefined || updates.description !== undefined) {
      const title = updates.title || '';
      const description = updates.description || '';
      updateData.text = `${title}\n\n${description}`.trim();
    }

    const { error: updateError } = await supabase
      .from('social_ideas')
      .update(updateData)
      .eq('id', ideaId);

    if (updateError) {
      console.error('Error updating idea:', updateError);
      return {
        success: false,
        error: translateError(updateError.message || 'שגיאה בעדכון רעיון'),
      };
    }

    // Fetch updated idea
    const result = await getIdeas();
    if (result.success && result.data) {
      const updatedIdea = result.data.find(i => i.id === ideaId);
      if (updatedIdea) {
        return { success: true, data: updatedIdea };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateIdea:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בעדכון רעיון'),
    };
  }
}

/**
 * Server Action: Delete an idea
 */
export async function deleteIdea(ideaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('social_ideas')
      .delete()
      .eq('id', ideaId);

    if (error) {
      console.error('Error deleting idea:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה במחיקת רעיון'),
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteIdea:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה במחיקת רעיון'),
    };
  }
}

