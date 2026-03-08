/**
 * LinkedIn Publishing Engine
 * Direct publishing to LinkedIn profiles and pages
 */

import { logger } from '@/lib/server/logger';
import { createLinkedInPost } from '@/lib/social-oauth/linkedin';

export interface PublishToLinkedInParams {
  accessToken: string;
  authorUrn: string; // urn:li:person:{id} or urn:li:organization:{id}
  content: string;
  imageUrl?: string;
}

export interface LinkedInPublishResult {
  platformPostId: string;
  platformPostUrl?: string;
  publishedAt: Date;
}

/**
 * Publish post to LinkedIn
 */
export async function publishToLinkedIn(params: PublishToLinkedInParams): Promise<LinkedInPublishResult> {
  try {
    const result = await createLinkedInPost({
      accessToken: params.accessToken,
      authorUrn: params.authorUrn,
      text: params.content,
      imageUrl: params.imageUrl,
    });

    return {
      platformPostId: result.id,
      platformPostUrl: `https://www.linkedin.com/feed/update/${result.id}`,
      publishedAt: new Date(),
    };
  } catch (error) {
    logger.error('LinkedInPublish', 'Publishing error', error);
    throw error;
  }
}

/**
 * Delete LinkedIn post
 */
export async function deleteLinkedInPost(params: {
  postId: string;
  accessToken: string;
}): Promise<void> {
  const response = await fetch(`https://api.linkedin.com/v2/ugcPosts/${params.postId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete LinkedIn post: ${error}`);
  }
}
