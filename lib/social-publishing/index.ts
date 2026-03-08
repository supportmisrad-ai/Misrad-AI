/**
 * Social Publishing - Main Orchestrator
 * Unified interface for publishing to all platforms
 */

import { publishToFacebook, type PublishToFacebookParams, type FacebookPublishResult } from './publish-to-facebook';
import { publishToInstagram, type PublishToInstagramParams, type InstagramPublishResult } from './publish-to-instagram';
import { publishToLinkedIn, type PublishToLinkedInParams, type LinkedInPublishResult } from './publish-to-linkedin';
import { logger } from '@/lib/server/logger';
import prisma from '@/lib/prisma';

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok';

export interface PublishParams {
  platform: SocialPlatform;
  organizationId: string;
  clientId: string;
  postId: string;
  content: string;
  mediaUrl?: string;
  scheduledTime?: Date;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  publishedAt?: Date;
  error?: string;
}

/**
 * Get client's access token for a platform
 */
async function getClientToken(clientId: string, platform: SocialPlatform) {
  const token = await prisma.clientSocialToken.findFirst({
    where: {
      clientId,
      platform,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!token) {
    throw new Error(`No active ${platform} token found for client`);
  }

  // Check if token is expired
  if (token.expiresAt && token.expiresAt < new Date()) {
    throw new Error(`${platform} token has expired`);
  }

  return token;
}

/**
 * Publish to a specific platform with automatic token retrieval
 */
export async function publishToPlatform(params: PublishParams): Promise<PublishResult> {
  try {
    const token = await getClientToken(params.clientId, params.platform);

    let result: FacebookPublishResult | InstagramPublishResult | LinkedInPublishResult;

    switch (params.platform) {
      case 'facebook': {
        if (!token.platformPageId) {
          throw new Error('No Facebook Page ID configured');
        }
        
        result = await publishToFacebook({
          pageAccessToken: token.accessToken,
          pageId: token.platformPageId,
          content: params.content,
          mediaUrl: params.mediaUrl,
          scheduledTime: params.scheduledTime,
        });
        break;
      }

      case 'instagram': {
        if (!token.platformUserId) {
          throw new Error('No Instagram Business Account ID configured');
        }
        if (!params.mediaUrl) {
          throw new Error('Instagram requires media (image or video)');
        }

        result = await publishToInstagram({
          igAccountId: token.platformUserId,
          pageAccessToken: token.accessToken,
          content: params.content,
          mediaUrl: params.mediaUrl,
        });
        break;
      }

      case 'linkedin': {
        if (!token.platformUserId) {
          throw new Error('No LinkedIn author URN configured');
        }

        result = await publishToLinkedIn({
          accessToken: token.accessToken,
          authorUrn: token.platformUserId,
          content: params.content,
          imageUrl: params.mediaUrl,
        });
        break;
      }

      default:
        throw new Error(`Platform ${params.platform} not yet supported`);
    }

    // Save published post record
    await prisma.socialMediaPublishedPost.create({
      data: {
        organizationId: params.organizationId,
        postId: params.postId,
        clientId: params.clientId,
        platform: params.platform,
        platformPostId: result.platformPostId,
        platformPostUrl: result.platformPostUrl,
        publishedAt: result.publishedAt,
        publishStatus: 'success',
      },
    });

    return {
      success: true,
      platformPostId: result.platformPostId,
      platformPostUrl: result.platformPostUrl,
      publishedAt: result.publishedAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('PublishToPlatform', `Failed to publish to ${params.platform}`, error);

    // Save failed publish attempt
    await prisma.socialMediaPublishedPost.create({
      data: {
        organizationId: params.organizationId,
        postId: params.postId,
        clientId: params.clientId,
        platform: params.platform,
        platformPostId: '',
        publishStatus: 'failed',
        errorMessage,
        publishedAt: new Date(),
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Publish to multiple platforms
 */
export async function publishToMultiplePlatforms(
  baseParams: Omit<PublishParams, 'platform'>,
  platforms: SocialPlatform[]
): Promise<Record<SocialPlatform, PublishResult>> {
  const results = await Promise.allSettled(
    platforms.map((platform) =>
      publishToPlatform({ ...baseParams, platform })
    )
  );

  const resultMap: Record<string, PublishResult> = {};

  platforms.forEach((platform, index) => {
    const result = results[index];
    if (result.status === 'fulfilled') {
      resultMap[platform] = result.value;
    } else {
      resultMap[platform] = {
        success: false,
        error: result.reason?.message || 'Unknown error',
      };
    }
  });

  return resultMap;
}
