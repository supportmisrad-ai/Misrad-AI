/**
 * Token Refresh Cron Job
 * Runs daily to refresh expiring OAuth tokens
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshFacebookToken, isTokenExpiringSoon } from '@/lib/social-oauth/facebook';
import { logger } from '@/lib/server/logger';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    return true; // Allow in dev
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

export async function POST(request: NextRequest) {
  return GET(request);
}
