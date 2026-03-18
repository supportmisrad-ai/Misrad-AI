'use server';

/**
 * Client Social Tokens Management
 * Server actions for managing OAuth tokens
 */

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import { createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { logger } from '@/lib/server/logger';
import { saveClientToken as saveClientTokenLib } from '@/lib/social-oauth/save-token';

export interface ClientToken {
  id: string;
  platform: string;
  platformPageName?: string;
  platformAccountType?: string;
  isActive: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
}

/**
 * Get all tokens for a client
 */
export async function getClientTokens(params: {
  clientId: string;
  orgSlug: string;
}): Promise<{ success: boolean; tokens?: ClientToken[]; error?: string }> {
  try {
    const organizationId = await requireOrganizationId(params.orgSlug);

    const tokens = await prisma.clientSocialToken.findMany({
      where: {
        organizationId,
        clientId: params.clientId,
      },
      select: {
        id: true,
        platform: true,
        platformPageName: true,
        platformAccountType: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return createSuccessResponse({ tokens });
  } catch (error) {
    logger.error('getClientTokens', 'Error fetching tokens', error);
    return createErrorResponse(error);
  }
}

/**
 * Save OAuth token for client (Server Action wrapper)
 */
export async function saveClientToken(params: {
  orgSlug: string;
  clientId: string;
  platform: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  platformUserId?: string;
  platformPageId?: string;
  platformPageName?: string;
  platformAccountType?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; tokenId?: string; error?: string }> {
  try {
    const result = await saveClientTokenLib(params);
    
    return result;
  } catch (error) {
    logger.error('saveClientToken', 'Error saving token', error);
    return createErrorResponse(error);
  }
}

/**
 * Delete/deactivate a token
 */
export async function deleteClientToken(params: {
  tokenId: string;
  orgSlug: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const organizationId = await requireOrganizationId(params.orgSlug);

    await prisma.clientSocialToken.updateMany({
      where: {
        id: params.tokenId,
        organizationId,
      },
      data: {
        isActive: false,
      },
    });

    return createSuccessResponse({});
  } catch (error) {
    logger.error('deleteClientToken', 'Error deleting token', error);
    return createErrorResponse(error);
  }
}

/**
 * Refresh token if needed
 */
export async function refreshClientToken(params: {
  tokenId: string;
  orgSlug: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const organizationId = await requireOrganizationId(params.orgSlug);

    const token = await prisma.clientSocialToken.findFirst({
      where: {
        id: params.tokenId,
        organizationId,
      },
    });

    if (!token) {
      throw new Error('Token not found');
    }

    // Platform-specific refresh logic
    if (token.platform === 'facebook') {
      const { refreshFacebookToken } = await import('@/lib/social-oauth/facebook');
      const newToken = await refreshFacebookToken(token.accessToken);

      await prisma.clientSocialToken.update({
        where: { id: token.id },
        data: {
          accessToken: newToken.access_token,
          expiresAt: newToken.expires_in
            ? new Date(Date.now() + newToken.expires_in * 1000)
            : null,
          lastRefreshedAt: new Date(),
        },
      });
    }
    // Add other platforms as needed

    return createSuccessResponse({});
  } catch (error) {
    logger.error('refreshClientToken', 'Error refreshing token', error);
    return createErrorResponse(error);
  }
}
