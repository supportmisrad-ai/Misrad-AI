'use server';

import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { auth } from '@clerk/nextjs/server';
import { ClientRequest, ManagerRequest } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { uploadFile } from './files';
import { updatePost } from './posts';

/**
 * Server Action: Get client requests
 */
export async function getClientRequests(clientId?: string): Promise<{ success: boolean; data?: ClientRequest[]; error?: string }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('social_client_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching client requests:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה בטעינת בקשות לקוח'),
      };
    }

    const requests: ClientRequest[] = (data || []).map((req: any) => ({
      id: req.id,
      clientId: req.client_id,
      type: req.type,
      content: req.content,
      mediaUrl: req.media_url,
      timestamp: req.created_at,
      status: req.status,
    }));

    return { success: true, data: requests };
  } catch (error: any) {
    console.error('Error in getClientRequests:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בטעינת בקשות לקוח'),
    };
  }
}

/**
 * Server Action: Get manager requests
 */
export async function getManagerRequests(clientId?: string): Promise<{ success: boolean; data?: ManagerRequest[]; error?: string }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('social_manager_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching manager requests:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה בטעינת בקשות מנהל'),
      };
    }

    const requests: ManagerRequest[] = (data || []).map((req: any) => ({
      id: req.id,
      clientId: req.client_id,
      title: req.title,
      description: req.description,
      type: req.type,
      status: req.status,
      createdAt: req.created_at,
      managerComment: req.manager_comment,
    }));

    return { success: true, data: requests };
  } catch (error: any) {
    console.error('Error in getManagerRequests:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בטעינת בקשות מנהל'),
    };
  }
}

/**
 * Server Action: Create client request
 */
export async function createClientRequest(
  requestData: {
    clientId: string;
    type: 'media' | 'text' | 'approval';
    content: string;
    mediaFile?: File | Blob;
    mediaUrl?: string;
  }
): Promise<{ success: boolean; data?: ClientRequest; error?: string }> {
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
    let mediaUrl = requestData.mediaUrl;
    if (requestData.mediaFile) {
      const uploadResult = await uploadFile(
        requestData.mediaFile,
        `request-${Date.now()}.${requestData.mediaFile.type.split('/')[1] || 'jpg'}`,
        'requests'
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    // Insert request
    const { data: request, error: requestError } = await supabase
      .from('social_client_requests')
      .insert({
        client_id: requestData.clientId,
        type: requestData.type,
        content: requestData.content,
        media_url: mediaUrl,
        status: 'new',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating client request:', requestError);
      return {
        success: false,
        error: translateError(requestError.message || 'שגיאה ביצירת בקשה'),
      };
    }

    const formattedRequest: ClientRequest = {
      id: request.id,
      clientId: request.client_id,
      type: request.type,
      content: request.content,
      mediaUrl: request.media_url,
      timestamp: request.created_at,
      status: request.status,
    };

    return { success: true, data: formattedRequest };
  } catch (error: any) {
    console.error('Error in createClientRequest:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה ביצירת בקשה'),
    };
  }
}

/**
 * Server Action: Create manager request
 */
export async function createManagerRequest(
  requestData: {
    clientId: string;
    title: string;
    description: string;
    type: 'media' | 'text' | 'approval';
  }
): Promise<{ success: boolean; data?: ManagerRequest; error?: string }> {
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

    // Insert request
    const { data: request, error: requestError } = await supabase
      .from('social_manager_requests')
      .insert({
        client_id: requestData.clientId,
        title: requestData.title,
        description: requestData.description,
        type: requestData.type,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating manager request:', requestError);
      return {
        success: false,
        error: translateError(requestError.message || 'שגיאה ביצירת בקשה'),
      };
    }

    const formattedRequest: ManagerRequest = {
      id: request.id,
      clientId: request.client_id,
      title: request.title,
      description: request.description,
      type: request.type,
      status: request.status,
      createdAt: request.created_at,
      managerComment: request.manager_comment,
    };

    return { success: true, data: formattedRequest };
  } catch (error: any) {
    console.error('Error in createManagerRequest:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה ביצירת בקשה'),
    };
  }
}

/**
 * Server Action: Approve client request (and update related post if exists)
 */
export async function approveClientRequest(
  requestId: string,
  postId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabase = createClient();

    // Update request status
    const { error: requestError } = await supabase
      .from('social_client_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (requestError) {
      console.error('Error approving request:', requestError);
      return {
        success: false,
        error: translateError(requestError.message || 'שגיאה באישור בקשה'),
      };
    }

    // If postId provided, update post status to approved
    if (postId) {
      const result = await updatePost(postId, { status: 'pending_approval' });
      if (!result.success) {
        console.error('Error updating post status:', result.error);
        // Don't fail the whole operation
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in approveClientRequest:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה באישור בקשה'),
    };
  }
}
/**
 * Server Action: Reject client request
 */
export async function rejectClientRequest(
  requestId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('social_client_requests')
      .update({ 
        status: 'rejected',
        // You might want to add a rejection_reason field to the table
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה בדחיית בקשה'),
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in rejectClientRequest:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בדחיית בקשה'),
    };
  }
}

/**
 * Server Action: Update manager request status
 */
export async function updateManagerRequest(
  requestId: string,
  updates: {
    status?: 'pending' | 'approved' | 'rejected' | 'completed';
    managerComment?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabase = createClient();

    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.managerComment !== undefined) updateData.manager_comment = updates.managerComment;

    const { error } = await supabase
      .from('social_manager_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      console.error('Error updating manager request:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה בעדכון בקשה'),
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateManagerRequest:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בעדכון בקשה'),
    };
  }
}

