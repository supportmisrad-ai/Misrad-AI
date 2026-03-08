/**
 * Instagram Publishing Engine
 * Direct publishing to Instagram Business Accounts via Facebook Graph API
 */

import { logger } from '@/lib/server/logger';
import { createInstagramMediaContainer, publishInstagramMedia } from '@/lib/social-oauth/instagram';

export interface PublishToInstagramParams {
  igAccountId: string;
  pageAccessToken: string;
  content: string;
  mediaUrl: string; // Instagram requires media
}

export interface InstagramPublishResult {
  platformPostId: string;
  platformPostUrl?: string;
  publishedAt: Date;
}

/**
 * Publish post to Instagram Business Account
 * Note: Instagram requires an image or video - text-only posts are not supported
 */
export async function publishToInstagram(params: PublishToInstagramParams): Promise<InstagramPublishResult> {
  try {
    if (!params.mediaUrl) {
      throw new Error('Instagram posts require media (image or video)');
    }

    // 1. Create media container
    const container = await createInstagramMediaContainer({
      igAccountId: params.igAccountId,
      accessToken: params.pageAccessToken,
      imageUrl: params.mediaUrl,
      caption: params.content,
    });

    // 2. Publish the container
    const published = await publishInstagramMedia({
      igAccountId: params.igAccountId,
      accessToken: params.pageAccessToken,
      creationId: container.id,
    });

    return {
      platformPostId: published.id,
      platformPostUrl: `https://www.instagram.com/p/${published.id}`,
      publishedAt: new Date(),
    };
  } catch (error) {
    logger.error('InstagramPublish', 'Publishing error', error);
    throw error;
  }
}

/**
 * Delete Instagram post
 */
export async function deleteInstagramPost(params: {
  mediaId: string;
  accessToken: string;
}): Promise<void> {
  const response = await fetch(`https://graph.facebook.com/v18.0/${params.mediaId}?access_token=${params.accessToken}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Instagram post: ${error}`);
  }
}
