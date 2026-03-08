/**
 * Token Refresh Cron Job
 * Runs daily to refresh expiring OAuth tokens
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 *
 * Security: Protected by cronGuard (CRON_SECRET + tenant isolation global_admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshFacebookToken } from '@/lib/social-oauth/facebook';
import { logger } from '@/lib/server/logger';
import { cronGuard } from '@/lib/api-cron-guard';

async function GETHandler(_request: NextRequest) {
  try {
    // Find tokens expiring within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringTokens = await prisma.clientSocialToken.findMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: sevenDaysFromNow,
          gte: new Date(), // Not already expired
        },
      },
      take: 100,
    });

    let refreshed = 0;
    let failed = 0;

    for (const token of expiringTokens) {
      try {
        if (token.platform === 'facebook' || token.platform === 'instagram') {
          // Refresh Facebook/Instagram token
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
          
          refreshed++;
          logger.info('TokenRefresh', `Refreshed ${token.platform} token for client ${token.clientId}`);
        }
        // Add other platforms as needed (LinkedIn has refresh_token flow)
      } catch (error) {
        failed++;
        logger.error('TokenRefresh', `Failed to refresh token ${token.id}`, error);
        
        // Deactivate token if refresh fails
        await prisma.clientSocialToken.update({
          where: { id: token.id },
          data: { isActive: false },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${expiringTokens.length} tokens`,
      refreshed,
      failed,
    });

  } catch (error) {
    logger.error('TokenRefresh', 'Cron job error', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    );
  }
}

export const GET = cronGuard(GETHandler);
export const POST = cronGuard(GETHandler);

export const dynamic = 'force-dynamic';
export const revalidate = 0;
