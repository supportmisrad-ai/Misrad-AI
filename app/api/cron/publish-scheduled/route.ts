/**
 * Scheduled Post Publishing Cron Job
 * Runs every 5 minutes to publish scheduled posts
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishToMultiplePlatforms } from '@/lib/social-publishing';
import { logger } from '@/lib/server/logger';
import { resolveStorageUrlsMaybeBatchedServiceRole } from '@/lib/services/operations/storage';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    logger.warn('CronPublish', 'CRON_SECRET not configured');
    return true; // Allow in dev
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
          platforms as any[]
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

// POST method for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
