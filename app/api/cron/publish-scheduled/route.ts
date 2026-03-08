/**
 * Scheduled Post Publishing Cron Job
 * Runs every 5 minutes to publish scheduled posts
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 *
 * Security: Protected by cronGuard (CRON_SECRET + tenant isolation global_admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishToMultiplePlatforms, type SocialPlatform } from '@/lib/social-publishing';
import { logger } from '@/lib/server/logger';
import { resolveStorageUrlsMaybeBatchedServiceRole } from '@/lib/services/operations/storage';
import { cronGuard } from '@/lib/api-cron-guard';

async function GETHandler(_request: NextRequest) {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Find posts scheduled for publishing
    const scheduledPosts = await prisma.socialPost.findMany({
      where: {
        status: 'scheduled',
        scheduled_at: {
          lte: now,
          gte: fiveMinutesAgo, // Don't process very old posts
        },
        deleted_at: null,
      },
      include: {
        postPlatforms: {
          select: { platform: true },
        },
      },
      take: 50, // Batch size
    });

    if (scheduledPosts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No posts to publish',
        processed: 0 
      });
    }

    let published = 0;
    let failed = 0;

    // Process each post
    for (const post of scheduledPosts) {
      try {
        const platforms = post.postPlatforms.map(pp => pp.platform);
        
        // Resolve media URL if exists
        let mediaUrl: string | undefined;
        if (post.media_url) {
          const rawUrl = String(post.media_url);
          if (rawUrl.startsWith('sb://')) {
            const resolved = await resolveStorageUrlsMaybeBatchedServiceRole(
              [rawUrl],
              3600,
              { organizationId: post.organizationId }
            );
            mediaUrl = resolved[0] || undefined;
          } else {
            mediaUrl = rawUrl;
          }
        }

        // Publish to all platforms
        const results = await publishToMultiplePlatforms(
          {
            organizationId: post.organizationId,
            clientId: post.clientId,
            postId: post.id,
            content: post.content,
            mediaUrl,
          },
          platforms as SocialPlatform[]
        );

        // Check if at least one platform succeeded
        const successCount = Object.values(results).filter(r => r.success).length;

        if (successCount > 0) {
          // Update post status to published
          await prisma.socialPost.update({
            where: { id: post.id },
            data: {
              status: 'published',
              published_at: new Date(),
            },
          });
          published++;
        } else {
          // All platforms failed - mark as failed
          await prisma.socialPost.update({
            where: { id: post.id },
            data: {
              status: 'failed',
            },
          });
          failed++;
          logger.error('CronPublish', `All platforms failed for post ${post.id}`);
        }
      } catch (error) {
        failed++;
        logger.error('CronPublish', `Error publishing post ${post.id}`, error);
        
        // Mark post as failed
        await prisma.socialPost.update({
          where: { id: post.id },
          data: { status: 'failed' },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${scheduledPosts.length} posts`,
      published,
      failed,
    });

  } catch (error) {
    logger.error('CronPublish', 'Cron job error', error);
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
