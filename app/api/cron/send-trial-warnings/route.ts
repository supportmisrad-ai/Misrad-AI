import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { sendTrialExpiryWarnings } from '@/lib/services/check-expired-trials';
import { timingSafeCompare } from '@/lib/server/timing-safe';

/**
 * Cron Job API Route: Send trial expiry warning emails
 *
 * Security: This endpoint is protected by CRON_SECRET in headers
 *
 * Usage:
 * - Call this endpoint from your cron service (Vercel Cron, GitHub Actions, etc.)
 * - Add header: Authorization: Bearer <CRON_SECRET>
 *
 * Example with curl:
 * curl -X POST https://yourdomain.com/api/cron/send-trial-warnings \
 *   -H "Authorization: Bearer your-cron-secret-here"
 *
 * Example Vercel Cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/send-trial-warnings",
 *     "schedule": "0 9,17 * * *"
 *   }]
 * }
 *
 * Recommended schedule: Twice daily at 9 AM and 5 PM (0 9,17 * * *)
 */
async function handler(request: NextRequest) {
  try {
    // Security check: Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('send-trial-warnings-cron', 'CRON_SECRET not configured in environment');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    // Check if authorization header is present
    if (!authHeader) {
      logger.warn('send-trial-warnings-cron', 'Unauthorized attempt - no authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - missing authorization header' },
        { status: 401 }
      );
    }

    // Verify Bearer token (timing-safe)
    const token = authHeader.replace('Bearer ', '').trim();
    if (!timingSafeCompare(token, cronSecret)) {
      logger.warn('send-trial-warnings-cron', 'Unauthorized attempt - invalid token');
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    // Execute the check
    logger.info('send-trial-warnings-cron', 'Starting cron job execution');
    const result = await sendTrialExpiryWarnings();

    if (!result.success) {
      logger.error('send-trial-warnings-cron', 'Cron job failed', { error: result.error });
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    logger.info('send-trial-warnings-cron', 'Cron job completed successfully', result.data);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        totalChecked: result.data?.totalChecked || 0,
        warningsSent: result.data?.warningsSent || 0,
        warnings: result.data?.warnings || [],
      },
    });
  } catch (error) {
    logger.error('send-trial-warnings-cron', 'Unexpected error in cron job', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Vercel Cron sends GET requests; also support POST for manual triggers
export const GET = handler;
export const POST = handler;

// Prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
