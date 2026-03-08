/**
 * Social OAuth Types
 * Type definitions for OAuth flows and token management
 */

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok';

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface FacebookTokenResponse extends OAuthTokenResponse {
  data_access_expiration_time?: number;
}

export interface FacebookPageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  category_list?: Array<{ id: string; name: string }>;
}

export interface InstagramBusinessAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export interface LinkedInUserInfo {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    displayImage: string;
  };
}

export interface OAuthState {
  clientId: string;
  portalToken?: string;
  orgSlug: string;
  returnUrl?: string;
  nonce: string;
  timestamp: number;
}

export interface SaveTokenParams {
  organizationId: string;
  clientId: string;
  platform: SocialPlatform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  platformUserId?: string;
  platformPageId?: string;
  platformPageName?: string;
  platformAccountType?: string;
  metadata?: Record<string, any>;
}
