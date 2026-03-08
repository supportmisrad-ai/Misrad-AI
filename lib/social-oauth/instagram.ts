/**
 * Instagram OAuth & Graph API Integration
 * Instagram Business API via Facebook Graph API
 */

import { logger } from '@/lib/server/logger';

const FB_GRAPH_VERSION = 'v18.0';
const FB_GRAPH_BASE = `https://graph.facebook.com/${FB_GRAPH_VERSION}`;

/**
 * Get Instagram Business Account details
 */
export async function getInstagramAccountInfo(
  igAccountId: string,
  accessToken: string
): Promise<{
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}> {
  const url = new URL(`${FB_GRAPH_BASE}/${igAccountId}`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'id,username,name,profile_picture_url,followers_count,follows_count,media_count');

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.text();
    logger.error('InstagramAPI', 'Failed to fetch account info', error);
    throw new Error(`Failed to fetch Instagram account: ${error}`);
  }

  return await response.json();
}

/**
 * Create Instagram media container (for publishing)
 */
export async function createInstagramMediaContainer(params: {
  igAccountId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<{ id: string }> {
  const url = new URL(`${FB_GRAPH_BASE}/${params.igAccountId}/media`);
  
  const body = new URLSearchParams();
  body.set('image_url', params.imageUrl);
  body.set('caption', params.caption);
  body.set('access_token', params.accessToken);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('InstagramAPI', 'Failed to create media container', error);
    throw new Error(`Failed to create Instagram media: ${error}`);
  }

  return await response.json();
}

/**
 * Publish Instagram media
 */
export async function publishInstagramMedia(params: {
  igAccountId: string;
  accessToken: string;
  creationId: string;
}): Promise<{ id: string }> {
  const url = new URL(`${FB_GRAPH_BASE}/${params.igAccountId}/media_publish`);
  
  const body = new URLSearchParams();
  body.set('creation_id', params.creationId);
  body.set('access_token', params.accessToken);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('InstagramAPI', 'Failed to publish media', error);
    throw new Error(`Failed to publish Instagram media: ${error}`);
  }

  return await response.json();
}

/**
 * Get Instagram media insights (engagement data)
 */
export async function getInstagramMediaInsights(params: {
  mediaId: string;
  accessToken: string;
}): Promise<{
  likes?: number;
  comments?: number;
  shares?: number;
  saved?: number;
  reach?: number;
  impressions?: number;
}> {
  const url = new URL(`${FB_GRAPH_BASE}/${params.mediaId}/insights`);
  url.searchParams.set('access_token', params.accessToken);
  url.searchParams.set('metric', 'engagement,impressions,reach,saved');

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    logger.warn('InstagramAPI', `Failed to fetch insights for ${params.mediaId}`);
    return {};
  }

  const result = await response.json();
  const insights: Record<string, number> = {};
  
  if (result.data && Array.isArray(result.data)) {
    result.data.forEach((metric: any) => {
      if (metric.values && metric.values[0]) {
        insights[metric.name] = metric.values[0].value || 0;
      }
    });
  }

  return insights;
}
