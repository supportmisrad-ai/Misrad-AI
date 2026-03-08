/**
 * LinkedIn OAuth & API Integration
 * LinkedIn Pages and Organization publishing
 */

import { OAuthTokenResponse } from './types';
import { logger } from '@/lib/server/logger';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

/**
 * Generate LinkedIn OAuth authorization URL
 */
export function getLinkedInAuthUrl(params: {
  redirectUri: string;
  state: string;
  scope?: string[];
}): string {
  const scope = params.scope || [
    'r_liteprofile',
    'r_emailaddress',
    'w_member_social',
    'w_organization_social',
  ];

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', LINKEDIN_CLIENT_ID || '');
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('scope', scope.join(' '));

  return url.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<OAuthTokenResponse> {
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: LINKEDIN_CLIENT_ID || '',
      client_secret: LINKEDIN_CLIENT_SECRET || '',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('LinkedInOAuth', 'Token exchange failed', error);
    throw new Error(`LinkedIn token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get LinkedIn user profile
 */
export async function getLinkedInProfile(accessToken: string): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}> {
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('LinkedInAPI', 'Failed to fetch profile', error);
    throw new Error(`Failed to fetch LinkedIn profile: ${error}`);
  }

  const data = await response.json();
  
  return {
    id: data.id,
    firstName: data.localizedFirstName || '',
    lastName: data.localizedLastName || '',
    profilePicture: data.profilePicture?.displayImage || undefined,
  };
}

/**
 * Create LinkedIn post (UGC - User Generated Content)
 */
export async function createLinkedInPost(params: {
  accessToken: string;
  authorUrn: string; // urn:li:person:{personId} or urn:li:organization:{orgId}
  text: string;
  imageUrl?: string;
}): Promise<{ id: string }> {
  const shareContent: any = {
    author: params.authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: params.text,
        },
        shareMediaCategory: params.imageUrl ? 'IMAGE' : 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  if (params.imageUrl) {
    shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = [
      {
        status: 'READY',
        originalUrl: params.imageUrl,
      },
    ];
  }

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(shareContent),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('LinkedInAPI', 'Failed to create post', error);
    throw new Error(`Failed to create LinkedIn post: ${error}`);
  }

  const result = await response.json();
  return { id: result.id };
}
