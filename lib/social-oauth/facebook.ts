/**
 * Facebook OAuth & Graph API Integration
 * Complete OAuth flow and token management for Facebook Pages
 */

import { OAuthTokenResponse, FacebookTokenResponse, FacebookPageInfo, SaveTokenParams } from './types';
import { logger } from '@/lib/server/logger';

const FB_APP_ID = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FB_GRAPH_VERSION = 'v18.0';
const FB_GRAPH_BASE = `https://graph.facebook.com/${FB_GRAPH_VERSION}`;

if (!FB_APP_ID || !FB_APP_SECRET) {
  logger.warn('FacebookOAuth', 'Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET in environment');
}

/**
 * Generate Facebook OAuth authorization URL
 */
export function getFacebookAuthUrl(params: {
  redirectUri: string;
  state: string;
  scope?: string[];
}): string {
  const scope = params.scope || [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_read_user_content',
    'business_management',
    'instagram_basic',
    'instagram_content_publish',
  ];

  const url = new URL(`https://www.facebook.com/${FB_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', FB_APP_ID || '');
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('scope', scope.join(','));
  url.searchParams.set('response_type', 'code');

  return url.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFacebookCode(
  code: string,
  redirectUri: string
): Promise<FacebookTokenResponse> {
  const url = new URL(`${FB_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('client_id', FB_APP_ID || '');
  url.searchParams.set('client_secret', FB_APP_SECRET || '');
  url.searchParams.set('code', code);
  url.searchParams.set('redirect_uri', redirectUri);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.text();
    logger.error('FacebookOAuth', 'Token exchange failed', error);
    throw new Error(`Facebook token exchange failed: ${error}`);
  }

  const data = await response.json();
  return data as FacebookTokenResponse;
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<FacebookTokenResponse> {
  const url = new URL(`${FB_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', FB_APP_ID || '');
  url.searchParams.set('client_secret', FB_APP_SECRET || '');
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.text();
    logger.error('FacebookOAuth', 'Long-lived token exchange failed', error);
    throw new Error(`Failed to get long-lived token: ${error}`);
  }

  return await response.json();
}

/**
 * Get user's Facebook Pages
 */
export async function getFacebookPages(accessToken: string): Promise<FacebookPageInfo[]> {
  const url = new URL(`${FB_GRAPH_BASE}/me/accounts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', 'id,name,access_token,category,category_list');

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.text();
    logger.error('FacebookAPI', 'Failed to fetch pages', error);
    throw new Error(`Failed to fetch Facebook pages: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get page's Instagram Business Account
 */
export async function getInstagramBusinessAccount(
  pageId: string,
  pageAccessToken: string
): Promise<{ id: string; username: string } | null> {
  const url = new URL(`${FB_GRAPH_BASE}/${pageId}`);
  url.searchParams.set('access_token', pageAccessToken);
  url.searchParams.set('fields', 'instagram_business_account{id,username,name,profile_picture_url,followers_count}');

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    logger.warn('FacebookAPI', `No Instagram account for page ${pageId}`);
    return null;
  }

  const data = await response.json();
  return data.instagram_business_account || null;
}

/**
 * Refresh Facebook access token
 * Note: Page tokens don't expire, but user tokens do
 */
export async function refreshFacebookToken(currentToken: string): Promise<FacebookTokenResponse> {
  // For Facebook, we exchange for a new long-lived token
  return getLongLivedToken(currentToken);
}

/**
 * Validate token and get expiration info
 */
export async function debugFacebookToken(accessToken: string): Promise<{
  isValid: boolean;
  expiresAt?: Date;
  scopes?: string[];
  userId?: string;
}> {
  const url = new URL(`${FB_GRAPH_BASE}/debug_token`);
  url.searchParams.set('input_token', accessToken);
  url.searchParams.set('access_token', `${FB_APP_ID}|${FB_APP_SECRET}`);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    return { isValid: false };
  }

  const result = await response.json();
  const data = result.data;

  return {
    isValid: data.is_valid || false,
    expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined,
    scopes: data.scopes || [],
    userId: data.user_id,
  };
}

/**
 * Check if token is expired or will expire soon (within 7 days)
 */
export function isTokenExpiringSoon(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  
  const now = new Date();
  const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysUntilExpiry <= 7;
}
