'use server';

import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import { auth } from '@clerk/nextjs/server';
import { SocialPost, SocialPlatform } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { uploadFile } from './files';
import { createPostSchema, validateWithSchema } from '@/lib/validation';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

/**
 * Server Action: Get all posts
 */
export async function getPosts(
  clientId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: SocialPost[]; error?: string }> {
  try {
    const supabase = createClient();

    const organizationId = orgId ? (await requireWorkspaceAccessByOrgSlug(orgId))?.id : null;

    let query = supabase
      .from('social_posts')
      .select(`
        *,
        social_post_platforms (platform),
        social_post_comments (*),
        clients!inner (organization_id)
      `)
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('clients.organization_id', organizationId);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה בטעינת פוסטים'),
      };
    }

    const posts: SocialPost[] = (data || []).map((post: any) => ({
      id: post.id,
      clientId: post.client_id,
      content: post.content,
      mediaUrl: post.media_url,
      status: post.status,
      scheduledAt: post.scheduled_at,
      publishedAt: post.published_at,
      platforms: (post.social_post_platforms || []).map((pp: any) => pp.platform),
      createdAt: post.created_at,
    }));

    return { success: true, data: posts };
  } catch (error: any) {
    console.error('Error in getPosts:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בטעינת פוסטים'),
    };
  }
}

/**
 * Server Action: Create a new post
 */
export async function createPost(
  postData: {
    clientId: string;
    content: string;
    platforms: SocialPlatform[];
    mediaFile?: File | Blob;
    mediaUrl?: string;
    scheduledAt?: string;
    status?: SocialPost['status'];
  }
): Promise<{ success: boolean; data?: SocialPost; error?: string }> {
  try {
    // Validate input
    const validation = validateWithSchema(createPostSchema, postData);
    if (!validation.success) {
      return validation;
    }

    // Check authentication
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return authCheck as any;
    }
    const userId = authCheck.userId || authCheck.data?.userId;
    if (!userId) {
      return { success: false, error: 'לא נמצא מזהה משתמש' };
    }

    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה בקבלת משתמש' };
    }
    const supabaseUserId = userResult.userId;

    const supabase = createClient();

    // Upload media file if provided
    let mediaUrl = postData.mediaUrl;
    if (postData.mediaFile) {
      const uploadResult = await uploadFile(
        postData.mediaFile,
        `post-${Date.now()}.${postData.mediaFile.type.split('/')[1] || 'jpg'}`,
        'posts'
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    // Insert post
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .insert({
        client_id: postData.clientId,
        content: postData.content,
        media_url: mediaUrl,
        status: postData.status || 'draft',
        scheduled_at: postData.scheduledAt || null,
        created_by: supabaseUserId,
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return {
        success: false,
        error: translateError(postError.message || 'שגיאה ביצירת פוסט'),
      };
    }

    // Insert platforms
    if (postData.platforms.length > 0) {
      const { error: platformsError } = await supabase
        .from('social_post_platforms')
        .insert(
          postData.platforms.map(platform => ({
            post_id: post.id,
            platform: platform,
          }))
        );

      if (platformsError) {
        console.error('Error adding platforms:', platformsError);
        // Don't fail the whole operation, just log it
      }
    }

    // Fetch complete post
    const result = await getPosts(postData.clientId);
    if (result.success && result.data) {
      const createdPost = result.data.find(p => p.id === post.id);
      if (createdPost) {
        return { success: true, data: createdPost };
      }
    }

    return {
      success: false,
      error: 'הפוסט נוצר אך נכשל בטעינת הנתונים המלאים',
    };
  } catch (error: any) {
    console.error('Error in createPost:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה ביצירת פוסט'),
    };
  }
}

/**
 * Server Action: Update a post
 */
export async function updatePost(
  postId: string,
  updates: {
    content?: string;
    platforms?: SocialPlatform[];
    mediaFile?: File | Blob;
    mediaUrl?: string;
    scheduledAt?: string;
    status?: SocialPost['status'];
  }
): Promise<{ success: boolean; data?: SocialPost; error?: string }> {
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
        `post-${Date.now()}.${updates.mediaFile.type.split('/')[1] || 'jpg'}`,
        'posts'
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    // Update post
    const updateData: any = {};
    if (updates.content !== undefined) updateData.content = updates.content;
    if (mediaUrl !== undefined) updateData.media_url = mediaUrl;
    if (updates.scheduledAt !== undefined) updateData.scheduled_at = updates.scheduledAt;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { error: updateError } = await supabase
      .from('social_posts')
      .update(updateData)
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post:', updateError);
      return {
        success: false,
        error: translateError(updateError.message || 'שגיאה בעדכון פוסט'),
      };
    }

    // Update platforms if provided
    if (updates.platforms) {
      // Delete existing platforms
      await supabase
        .from('social_post_platforms')
        .delete()
        .eq('post_id', postId);

      // Insert new platforms
      if (updates.platforms.length > 0) {
        const { error: platformsError } = await supabase
          .from('social_post_platforms')
          .insert(
            updates.platforms.map(platform => ({
              post_id: postId,
              platform: platform,
            }))
          );

        if (platformsError) {
          console.error('Error updating platforms:', platformsError);
        }
      }
    }

    // Fetch updated post
    const result = await getPosts();
    if (result.success && result.data) {
      const updatedPost = result.data.find(p => p.id === postId);
      if (updatedPost) {
        return { success: true, data: updatedPost };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updatePost:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בעדכון פוסט'),
    };
  }
}

/**
 * Server Action: Delete a post
 */
export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabase = createClient();

    // Get post to delete media if exists
    const { data: post } = await supabase
      .from('social_posts')
      .select('media_url')
      .eq('id', postId)
      .single();

    // Delete post (cascade will delete platforms and comments)
    const { error } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה במחיקת פוסט'),
      };
    }

    // Delete media file from storage if exists
    if (post?.media_url) {
      try {
        // Extract file path from URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/media/[path]
        const urlParts = post.media_url.split('/media/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          const { deleteFile } = await import('./files');
          await deleteFile(filePath);
        }
      } catch (fileError) {
        // Log error but don't fail the post deletion
        console.error('Error deleting media file:', fileError);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deletePost:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה במחיקת פוסט'),
    };
  }
}

/**
 * Server Action: Publish a post (change status to published)
 */
export async function publishPost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('social_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      console.error('Error publishing post:', error);
      return {
        success: false,
        error: translateError(error.message || 'שגיאה בפרסום פוסט'),
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in publishPost:', error);
    return {
      success: false,
      error: translateError(error.message || 'שגיאה בפרסום פוסט'),
    };
  }
}

