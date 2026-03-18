'use server';



import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';
import { getOrCreateSocialSupabaseUserAction } from '@/app/actions/social-users';
import { auth } from '@clerk/nextjs/server';
import { SocialPost, SocialPlatform, PostStatus } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { uploadFile } from './files';
import { createPostSchema, validateWithSchema } from '@/lib/validation';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { triggerWebhookEvent } from './integrations';
import { Prisma } from '@prisma/client';
import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
import { createStorageClient } from '@/lib/supabase';
import {
  assertStoragePathScoped,
  parseSbRef,
  resolveStorageUrlsMaybeBatchedWithClient,
  toSbRefMaybe,
} from '@/lib/services/operations/storage';
import { hasReachedPostLimit } from '@/lib/social/plan-limits';
import { SocialPlan } from '@/types/social';


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

async function requireOrganizationIdForOrgSlug(orgSlug: string): Promise<string> {
  const resolvedOrgSlug = String(orgSlug || '').trim();
  if (!resolvedOrgSlug) {
    throw new Error('Missing orgSlug');
  }
  const workspace = await requireWorkspaceAccessByOrgSlugApi(resolvedOrgSlug);
  return String(workspace.id);
}

async function assertClientInOrganization(params: { clientId: string; organizationId: string }): Promise<void> {
  // Check ClientClient table (primary table used by social module)
  const row = await prisma.clientClient.findFirst({
    where: {
      id: String(params.clientId),
      organizationId: String(params.organizationId),
    },
    select: { id: true },
  });

  if (row?.id) return;

  // Fallback: check legacy clients table
  const legacyRow = await prisma.clients.findFirst({
    where: {
      id: String(params.clientId),
      organization_id: String(params.organizationId),
    },
    select: { id: true },
  });

  if (!legacyRow?.id) {
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
export async function getPosts(params: {
  orgSlug: string;
  clientId?: string;
}): Promise<{ success: boolean; data?: SocialPost[]; error?: string }> {
  try {
    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(params.orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    type PostRow = Prisma.SocialPostGetPayload<{
      include: {
        postPlatforms: { select: { platform: true } };
        postComments: true;
      };
    }>;

    const rows: PostRow[] = await prisma.socialPost.findMany({
      where: {
        organizationId,
        ...(params.clientId ? { clientId: params.clientId } : {}),
      },
      include: {
        postPlatforms: { select: { platform: true } },
        postComments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rawPosts: SocialPost[] = (rows || []).map((post) => {
      const platforms = (post.postPlatforms || [])
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

    const ttlSeconds = 60 * 60;
    const refsOrUrls = rawPosts.map((p) => {
      const raw = p.mediaUrl ? String(p.mediaUrl).trim() : '';
      if (!raw) return null;
      return toSbRefMaybe(raw) || raw;
    });

    let resolved: (string | null)[] = refsOrUrls.map(() => null);
    try {
      const supabase = createStorageClient();
      resolved = await resolveStorageUrlsMaybeBatchedWithClient(supabase, refsOrUrls, ttlSeconds, { organizationId });
    } catch {
      resolved = refsOrUrls.map(() => null);
    }

    const posts: SocialPost[] = rawPosts.map((p, idx) => {
      const raw = p.mediaUrl ? String(p.mediaUrl).trim() : '';
      const stable = raw ? (toSbRefMaybe(raw) || (raw.startsWith('sb://') ? raw : null)) : null;
      const url = resolved[idx] || (raw && !raw.startsWith('sb://') ? raw : undefined);
      return {
        ...p,
        mediaRef: stable || undefined,
        mediaUrl: url,
      };
    });


    return { success: true, data: posts };
  } catch (error: unknown) {
    logger.error('posts', 'Error in getPosts:', error);
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
    orgSlug: string;
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

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(postData.orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    await assertClientInOrganization({ clientId: postData.clientId, organizationId });

    // Check post quota for organization's plan
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { social_plan: true },
      });

      const socialPlan = (org?.social_plan as SocialPlan) || 'solo';

      // Count posts this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const postsThisMonth = await prisma.socialPost.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
        },
      });

      const limitCheck = hasReachedPostLimit(postsThisMonth, socialPlan);
      if (!limitCheck.allowed) {
        return {
          success: false,
          error: limitCheck.message || 'הגעת למגבלת הפוסטים החודשית',
        };
      }
    } catch (limitError) {
      logger.warn('posts', 'Failed to check post limit, allowing creation:', limitError);
      // Don't block creation if limit check fails
    }

    // Upload media file if provided
    let mediaUrl = postData.mediaUrl;
    if (mediaUrl) {
      const stable = toSbRefMaybe(String(mediaUrl));
      if (stable) mediaUrl = stable;
    }
    if (postData.mediaFile) {
      const uploadResult = await uploadFile(
        postData.mediaFile,
        `post-${Date.now()}.${postData.mediaFile.type.split('/')[1] || 'jpg'}`,
        'posts',
        postData.orgSlug
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
      logger.error('posts', 'Error creating post:', postError);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(postError) || 'שגיאה ביצירת פוסט'),
      };
    }

    // Insert platforms
    if (postData.platforms.length > 0) {
      try {
        await prisma.socialMediaPostPlatform.createMany({
          data: postData.platforms.map((platform) => ({
            organizationId,
            post_id: post.id,
            platform,
          })),
          skipDuplicates: true,
        });
      } catch (platformsError) {
        logger.error('posts', 'Error adding platforms:', platformsError);
        // Don't fail the whole operation, just log it
      }
    }

    // Fetch complete post
    const result = await getPosts({ orgSlug: postData.orgSlug, clientId: postData.clientId });
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
    logger.error('posts', 'Error in createPost:', error);
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
    orgSlug: string;
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

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(updates.orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertPostInOrganization({ postId, organizationId });

    // Upload new media file if provided
    let mediaUrl = updates.mediaUrl;
    if (mediaUrl) {
      const stable = toSbRefMaybe(String(mediaUrl));
      if (stable) mediaUrl = stable;
    }
    if (updates.mediaFile) {
      const uploadResult = await uploadFile(
        updates.mediaFile,
        `post-${Date.now()}.${updates.mediaFile.type.split('/')[1] || 'jpg'}`,
        'posts',
        updates.orgSlug
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
      logger.error('posts', 'Error updating post:', updateError);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(updateError) || 'שגיאה בעדכון פוסט'),
      };
    }

    // Update platforms if provided
    if (updates.platforms) {
      // Delete existing platforms
      await prisma.socialMediaPostPlatform.deleteMany({
        where: { post_id: postId, organizationId },
      });

      // Insert new platforms
      if (updates.platforms.length > 0) {
        try {
          await prisma.socialMediaPostPlatform.createMany({
            data: updates.platforms.map((platform) => ({
              organizationId,
              post_id: postId,
              platform,
            })),
            skipDuplicates: true,
          });
        } catch (platformsError) {
          logger.error('posts', 'Error updating platforms:', platformsError);
        }
      }
    }

    // Fetch updated post
    const result = await getPosts({ orgSlug: updates.orgSlug });
    if (result.success && result.data) {
      const updatedPost = result.data.find(p => p.id === postId);
      if (updatedPost) {
            return { success: true, data: updatedPost };
      }
    }


    return { success: true };
  } catch (error: unknown) {
    logger.error('posts', 'Error in updatePost:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בעדכון פוסט'),
    };
  }
}

/**
 * Server Action: Delete a post
 */
export async function deletePost(postId: string, orgSlug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
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
      logger.error('posts', 'Error deleting post:', error);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(error) || 'שגיאה במחיקת פוסט'),
      };
    }

    // Delete media file from storage if exists
    if (post?.media_url) {
      try {
        const rawUrl = String(post.media_url || '').trim();
        const stableRef = toSbRefMaybe(rawUrl) || (rawUrl.startsWith('sb://') ? rawUrl : null);

        if (stableRef) {
          const parsed = parseSbRef(stableRef);
          if (parsed && parsed.bucket === 'media') {
            assertStoragePathScoped({ rawRef: stableRef, path: parsed.path, organizationId });
            const { deleteFile } = await import('./files');
            await deleteFile(parsed.path);
          }
        } else {
          const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
          const isSupabaseObjectUrl =
            !!base &&
            (rawUrl.startsWith(base) || rawUrl.includes('/storage/v1/object/'));

          if (isSupabaseObjectUrl) {
            const urlParts = rawUrl.split('/media/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1];
              assertStoragePathScoped({ rawRef: `sb://media/${filePath}`, path: filePath, organizationId });
              const { deleteFile } = await import('./files');
              await deleteFile(filePath);
            }
          }
        }
      } catch (fileError) {
        // Log error but don't fail the post deletion
        logger.error('posts', 'Error deleting media file:', fileError);
      }
    }


    return { success: true };
  } catch (error: unknown) {
    logger.error('posts', 'Error in deletePost:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה במחיקת פוסט'),
    };
  }
}

/**
 * Server Action: Publish a post (change status to published)
 */
export async function publishPost(postId: string, orgSlug: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
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
        postPlatforms: { select: { platform: true } },
      },
    });

    if (!post?.id) {
      return { success: false, error: translateError('פוסט לא נמצא') };
    }

    const platforms = (post.postPlatforms || []).map((pp) => pp.platform).filter(isSocialPlatform);

    const rawMedia = post.media_url ? String(post.media_url) : null;
    const stableRef = rawMedia ? (toSbRefMaybe(rawMedia) || (rawMedia.startsWith('sb://') ? rawMedia : null)) : null;
    let resolvedMediaUrl: string | null = rawMedia;
    if (stableRef) {
      try {
        const supabase = createStorageClient();
        const resolved = await resolveStorageUrlsMaybeBatchedWithClient(supabase, [stableRef], 60 * 60, { organizationId });
        const rawIsSb = rawMedia ? rawMedia.startsWith('sb://') : false;
        resolvedMediaUrl = resolved[0] || (rawIsSb ? null : rawMedia);
      } catch {
        const rawIsSb = rawMedia ? rawMedia.startsWith('sb://') : false;
        resolvedMediaUrl = rawIsSb ? null : rawMedia;
      }
    }

    // Try Direct Publishing first, fallback to webhooks
    const { publishToMultiplePlatforms } = await import('@/lib/social-publishing');
    
    let directPublishSuccess = false;
    const publishErrors: string[] = [];

    try {
      const results = await publishToMultiplePlatforms(
        {
          organizationId,
          clientId: post.clientId,
          postId: post.id,
          content: post.content,
          mediaUrl: resolvedMediaUrl || undefined,
          scheduledTime: post.scheduled_at || undefined,
        },
        platforms as any[]
      );

      // Check if at least one platform succeeded
      const successfulPlatforms = Object.entries(results).filter(([_, r]) => r.success);
      directPublishSuccess = successfulPlatforms.length > 0;

      // Collect errors from failed platforms
      Object.entries(results).forEach(([platform, result]) => {
        if (!result.success) {
          publishErrors.push(`${platform}: ${result.error}`);
        }
      });
    } catch (directError: unknown) {
      logger.warn('posts', 'Direct publishing failed, falling back to webhooks:', directError);
      directPublishSuccess = false;
    }

    // Fallback to webhooks if direct publishing failed
    if (!directPublishSuccess) {
      const webhookResult = await triggerWebhookEvent({
        eventType: 'post_published',
        payload: {
          post: {
            id: post.id,
            clientId: post.clientId,
            content: post.content,
            mediaUrl: resolvedMediaUrl,
            platforms,
            scheduledAt: post.scheduled_at ? new Date(post.scheduled_at).toISOString() : null,
          },
        },
      });

      if (!webhookResult.success) {
        return { 
          success: false, 
          error: webhookResult.error || 'שגיאה בפרסום - אין חיבור ישיר וגם לא webhook מוגדר' 
        };
      }
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
      logger.error('posts', 'Error updating post status:', error);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(error) || 'שגיאה בעדכון סטטוס פוסט'),
      };
    }


    return { 
      success: true,
      message: directPublishSuccess 
        ? 'פורסם ישירות לרשתות החברתיות' 
        : 'נשלח דרך Make/Zapier לפרסום'
    };
  } catch (error: unknown) {
    logger.error('posts', 'Error in publishPost:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בפרסום פוסט'),
    };
  }
}
