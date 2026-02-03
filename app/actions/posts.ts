'use server';

import prisma from '@/lib/prisma';
import { getOrCreateSocialSupabaseUserAction } from '@/app/actions/social-users';
import { auth } from '@clerk/nextjs/server';
import { SocialPost, SocialPlatform, PostStatus } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { uploadFile } from './files';
import { createPostSchema, validateWithSchema } from '@/lib/validation';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { triggerWebhookEvent } from './integrations';
import { Prisma } from '@prisma/client';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getUnknownErrorMessage(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

function isSocialPlatform(value: unknown): value is SocialPlatform {
  return (
    value === 'facebook' ||
    value === 'instagram' ||
    value === 'linkedin' ||
    value === 'tiktok' ||
    value === 'twitter' ||
    value === 'google' ||
    value === 'whatsapp' ||
    value === 'threads' ||
    value === 'youtube' ||
    value === 'pinterest' ||
    value === 'portal'
  );
}

function isPostStatus(value: unknown): value is PostStatus {
  return (
    value === 'draft' ||
    value === 'internal_review' ||
    value === 'scheduled' ||
    value === 'published' ||
    value === 'failed' ||
    value === 'pending_approval'
  );
}

async function resolveOrganizationIdForCurrentUser(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const row = await prisma.social_users.findUnique({
      where: { clerk_user_id: String(userId) },
      select: { organization_id: true },
    });
    const orgId = row?.organization_id;
    return orgId ? String(orgId) : null;
  } catch {
    return null;
  }
}

async function assertClientInOrganization(params: { clientId: string; organizationId: string }): Promise<void> {
  const row = await prisma.clients.findFirst({
    where: {
      id: String(params.clientId),
      organization_id: String(params.organizationId),
    },
    select: { id: true },
  });

  if (!row?.id) {
    throw new Error('Forbidden');
  }
}

async function assertPostInOrganization(params: { postId: string; organizationId: string }): Promise<{ clientId: string; mediaUrl?: string | null }> {
  const row = await prisma.socialPost.findFirst({
    where: {
      id: String(params.postId),
      organizationId: String(params.organizationId),
    },
    select: { id: true, clientId: true, media_url: true },
  });

  if (!row?.id) {
    throw new Error('Forbidden');
  }

  return {
    clientId: String(row.clientId ?? ''),
    mediaUrl: row.media_url ?? null,
  };
}

/**
 * Server Action: Get all posts
 */
export async function getPosts(
  clientId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: SocialPost[]; error?: string }> {
  try {
    const organizationId = orgId
      ? (await requireWorkspaceAccessByOrgSlug(orgId))?.id
      : await resolveOrganizationIdForCurrentUser();

    if (!organizationId) {
      return { success: true, data: [] };
    }

    type PostRow = Prisma.SocialPostGetPayload<{
      include: {
        social_post_platforms: { select: { platform: true } };
        social_post_comments: true;
      };
    }>;

    const rows: PostRow[] = await prisma.socialPost.findMany({
      where: {
        organizationId,
        ...(clientId ? { clientId } : {}),
      },
      include: {
        social_post_platforms: { select: { platform: true } },
        social_post_comments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const posts: SocialPost[] = (rows || []).map((post) => {
      const platforms = (post.social_post_platforms || [])
        .map((pp) => pp.platform)
        .filter(isSocialPlatform);

      const status = isPostStatus(post.status) ? post.status : 'draft';

      return {
        id: post.id,
        clientId: post.clientId,
        content: post.content,
        mediaUrl: post.media_url ?? undefined,
        status,
        scheduledAt: post.scheduled_at ? new Date(post.scheduled_at).toISOString() : '',
        publishedAt: post.published_at ? new Date(post.published_at).toISOString() : undefined,
        platforms,
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
      };
    });

    return { success: true, data: posts };
  } catch (error: unknown) {
    console.error('Error in getPosts:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בטעינת פוסטים'),
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
      return { success: false, error: authCheck.error || 'נדרשת התחברות' };
    }
    const userId = authCheck.userId || authCheck.data?.userId;
    if (!userId) {
      return { success: false, error: 'לא נמצא מזהה משתמש' };
    }

    const userResult = await getOrCreateSocialSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return { success: false, error: userResult.error || 'שגיאה בקבלת משתמש' };
    }
    const supabaseUserId = userResult.userId;

    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: false, error: 'Forbidden' };
    }

    await assertClientInOrganization({ clientId: postData.clientId, organizationId });

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
    let post: { id: string } | null = null;
    try {
      post = await prisma.socialPost.create({
        data: {
          organizationId,
          clientId: postData.clientId,
          content: postData.content,
          media_url: mediaUrl ?? null,
          status: postData.status || 'draft',
          scheduled_at: postData.scheduledAt ? new Date(postData.scheduledAt) : null,
          created_by: supabaseUserId,
        },
        select: { id: true },
      });
    } catch (postError: unknown) {
      console.error('Error creating post:', postError);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(postError) || 'שגיאה ביצירת פוסט'),
      };
    }

    // Insert platforms
    if (postData.platforms.length > 0) {
      try {
        await prisma.social_post_platforms.createMany({
          data: postData.platforms.map((platform) => ({
            organizationId,
            post_id: post.id,
            platform,
          })),
          skipDuplicates: true,
        });
      } catch (platformsError) {
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
  } catch (error: unknown) {
    console.error('Error in createPost:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה ביצירת פוסט'),
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

    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertPostInOrganization({ postId, organizationId });

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
    const updateData: Prisma.SocialPostUpdateManyMutationInput = {};
    if (updates.content !== undefined) updateData.content = updates.content;
    if (mediaUrl !== undefined) updateData.media_url = mediaUrl;
    if (updates.scheduledAt !== undefined) updateData.scheduled_at = updates.scheduledAt ? new Date(updates.scheduledAt) : null;
    if (updates.status !== undefined) updateData.status = updates.status;

    try {
      await prisma.socialPost.updateMany({
        where: {
          id: postId,
          organizationId,
          clientId: scoped.clientId,
        },
        data: updateData,
      });
    } catch (updateError: unknown) {
      console.error('Error updating post:', updateError);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(updateError) || 'שגיאה בעדכון פוסט'),
      };
    }

    // Update platforms if provided
    if (updates.platforms) {
      // Delete existing platforms
      await prisma.social_post_platforms.deleteMany({
        where: { post_id: postId, organizationId },
      });

      // Insert new platforms
      if (updates.platforms.length > 0) {
        try {
          await prisma.social_post_platforms.createMany({
            data: updates.platforms.map((platform) => ({
              organizationId,
              post_id: postId,
              platform,
            })),
            skipDuplicates: true,
          });
        } catch (platformsError) {
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
  } catch (error: unknown) {
    console.error('Error in updatePost:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בעדכון פוסט'),
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

    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertPostInOrganization({ postId, organizationId });

    // Get post to delete media if exists
    const post = { media_url: scoped.mediaUrl };

    // Delete post (cascade will delete platforms and comments)
    try {
      await prisma.socialPost.deleteMany({
        where: {
          id: postId,
          organizationId,
          clientId: scoped.clientId,
        },
      });
    } catch (error: unknown) {
      console.error('Error deleting post:', error);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(error) || 'שגיאה במחיקת פוסט'),
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
  } catch (error: unknown) {
    console.error('Error in deletePost:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה במחיקת פוסט'),
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

    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertPostInOrganization({ postId, organizationId });

    const post = await prisma.socialPost.findFirst({
      where: {
        id: postId,
        organizationId,
        clientId: scoped.clientId,
      },
      include: {
        social_post_platforms: { select: { platform: true } },
      },
    });

    if (!post?.id) {
      return { success: false, error: translateError('פוסט לא נמצא') };
    }

    const platforms = (post.social_post_platforms || []).map((pp) => pp.platform).filter(isSocialPlatform);

    const webhookResult = await triggerWebhookEvent({
      eventType: 'post_published',
      payload: {
        post: {
          id: post.id,
          clientId: post.clientId,
          content: post.content,
          mediaUrl: post.media_url || null,
          platforms,
          scheduledAt: post.scheduled_at ? new Date(post.scheduled_at).toISOString() : null,
        },
      },
    });

    if (!webhookResult.success) {
      return { success: false, error: webhookResult.error || 'שגיאה בשליחת הפוסט לפרסום' };
    }

    try {
      await prisma.socialPost.updateMany({
        where: {
          id: postId,
          organizationId,
          clientId: scoped.clientId,
        },
        data: {
          status: 'published',
          published_at: new Date(),
        },
      });
    } catch (error: unknown) {
      console.error('Error publishing post:', error);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(error) || 'שגיאה בפרסום פוסט'),
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in publishPost:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בפרסום פוסט'),
    };
  }
}
