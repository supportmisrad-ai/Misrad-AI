/**
 * Social OAuth Token Persistence
 * Saves OAuth tokens to database (lib layer - can be called from API routes)
 */

import prisma from '@/lib/prisma';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import { logger } from '@/lib/server/logger';

export interface SaveTokenParams {
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
}

/**
 * Save OAuth token for client
 * Protected via requireOrganizationId (tenant isolation)
 */
export async function saveClientToken(
  params: SaveTokenParams
): Promise<{ success: boolean; tokenId?: string; error?: string }> {
  try {
    const organizationId = await requireOrganizationId(params.orgSlug);

    // Deactivate existing tokens for this platform/page combination
    if (params.platformPageId) {
      await prisma.clientSocialToken.updateMany({
        where: {
          organizationId,
          clientId: params.clientId,
          platform: params.platform,
          platformPageId: params.platformPageId,
        },
        data: {
          isActive: false,
        },
      });
    }

    // Create new token
    const token = await prisma.clientSocialToken.create({
      data: {
        organizationId,
        clientId: params.clientId,
        platform: params.platform,
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        expiresAt: params.expiresAt,
        scope: params.scope,
        platformUserId: params.platformUserId,
        platformPageId: params.platformPageId,
        platformPageName: params.platformPageName,
        platformAccountType: params.platformAccountType,
        metadata: params.metadata,
        isActive: true,
      },
    });

    return { success: true, tokenId: token.id };
  } catch (error) {
    logger.error('saveClientToken', 'Error saving OAuth token', error);
    return { success: false, error: String(error) };
  }
}
