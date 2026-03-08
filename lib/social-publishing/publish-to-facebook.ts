/**
 * Facebook Publishing Engine
 * Direct publishing to Facebook Pages via Graph API
 */

import { logger } from '@/lib/server/logger';

const FB_GRAPH_VERSION = 'v18.0';
const FB_GRAPH_BASE = `https://graph.facebook.com/${FB_GRAPH_VERSION}`;

export interface PublishToFacebookParams {
  pageAccessToken: string;
  pageId: string;
  content: string;
  mediaUrl?: string;
  scheduledTime?: Date;
}

export interface FacebookPublishResult {
  platformPostId: string;
  platformPostUrl?: string;
  publishedAt: Date;
}

/**
 * Upload photo to Facebook
 */
async function uploadPhotoToFacebook(params: {
  pageId: string;
  pageAccessToken: string;
  imageUrl: string;
}): Promise<string> {
  const url = new URL(`${FB_GRAPH_BASE}/${params.pageId}/photos`);
  
  const body = new URLSearchParams();
  body.set('url', params.imageUrl);
  body.set('published', 'false'); // Upload unpublished to get photo ID
  body.set('access_token', params.pageAccessToken);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload photo to Facebook: ${error}`);
  }

  const result = await response.json();
  return result.id; // Photo ID
}

/**
 * Publish post to Facebook Page
 */
export async function publishToFacebook(params: PublishToFacebookParams): Promise<FacebookPublishResult> {
  try {
    let photoId: string | undefined;

    // 1. Upload media if exists
    if (params.mediaUrl) {
      photoId = await uploadPhotoToFacebook({
        pageId: params.pageId,
        pageAccessToken: params.pageAccessToken,
        imageUrl: params.mediaUrl,
      });
    }

    // 2. Create post
    const url = new URL(`${FB_GRAPH_BASE}/${params.pageId}/feed`);
    
    const body = new URLSearchParams();
    body.set('message', params.content);
    body.set('access_token', params.pageAccessToken);

    if (photoId) {
      body.set('attached_media[0]', `{"media_fbid":"${photoId}"}`);
    }

    // Scheduled publishing
    if (params.scheduledTime) {
      const scheduledTimestamp = Math.floor(params.scheduledTime.getTime() / 1000);
      body.set('published', 'false');
      body.set('scheduled_publish_time', scheduledTimestamp.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('FacebookPublish', 'Failed to publish post', error);
      throw new Error(`Failed to publish to Facebook: ${error}`);
    }

    const result = await response.json();

    return {
      platformPostId: result.id,
      platformPostUrl: result.id ? `https://www.facebook.com/${result.id}` : undefined,
      publishedAt: params.scheduledTime || new Date(),
    };
  } catch (error) {
    logger.error('FacebookPublish', 'Publishing error', error);
    throw error;
  }
}

/**
 * Delete Facebook post
 */
export async function deleteFacebookPost(params: {
  postId: string;
  accessToken: string;
}): Promise<void> {
  const url = new URL(`${FB_GRAPH_BASE}/${params.postId}`);
  url.searchParams.set('access_token', params.accessToken);

  const response = await fetch(url.toString(), { method: 'DELETE' });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Facebook post: ${error}`);
  }
}

/**
 * Get Facebook post engagement data
 */
export async function getFacebookPostInsights(params: {
  postId: string;
  accessToken: string;
}): Promise<{
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  impressions?: number;
}> {
  const url = new URL(`${FB_GRAPH_BASE}/${params.postId}`);
  url.searchParams.set('access_token', params.accessToken);
  url.searchParams.set('fields', 'likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions,post_impressions_unique)');

  const response = await fetch(url.toString());

  if (!response.ok) {
    logger.warn('FacebookPublish', `Failed to fetch insights for ${params.postId}`);
    return {};
  }

  const data = await response.json();

  const insights: Record<string, number> = {};
  
  if (data.insights?.data) {
    data.insights.data.forEach((metric: any) => {
      if (metric.name === 'post_impressions') {
        insights.impressions = metric.values[0]?.value || 0;
      }
      if (metric.name === 'post_impressions_unique') {
        insights.reach = metric.values[0]?.value || 0;
      }
    });
  }

  return {
    likes: data.likes?.summary?.total_count || 0,
    comments: data.comments?.summary?.total_count || 0,
    shares: data.shares?.count || 0,
    reach: insights.reach,
    impressions: insights.impressions,
  };
}
