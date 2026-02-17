import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { checkAndDisableExpiredOrganizations } from '@/lib/services/check-expired-trials';

/**
 * Cron Job API Route: Check and disable expired trials
 *
 * Security: This endpoint is protected by CRON_SECRET in headers
 *
 * Usage:
 * - Call this endpoint from your cron service (Vercel Cron, GitHub Actions, etc.)
 * - Add header: Authorization: Bearer <CRON_SECRET>
 *
 * Example with curl:
 * curl -X POST https://yourdomain.com/api/cron/check-trial-expiry \
 *   -H "Authorization: Bearer your-cron-secret-here"
 *
 * Example Vercel Cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-trial-expiry",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * Recommended schedule: Daily at 2 AM (0 2 * * *)
 */
export async function POST(request: NextRequest) {
  try {
    // Security check: Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('check-trial-expiry-cron', 'CRON_SECRET not configured in environment');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    // Check if authorization header is present
    if (!authHeader) {
      logger.warn('check-trial-expiry-cron', 'Unauthorized attempt - no authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - missing authorization header' },
        { status: 401 }
      );
    }

    // Verify Bearer token
    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== cronSecret) {
      logger.warn('check-trial-expiry-cron', 'Unauthorized attempt - invalid token');
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    // Execute the check
    logger.info('check-trial-expiry-cron', 'Starting cron job execution');
    const result = await checkAndDisableExpiredOrganizations();

    if (!result.success) {
      logger.error('check-trial-expiry-cron', 'Cron job failed', { error: result.error });
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    logger.info('check-trial-expiry-cron', 'Cron job completed successfully', result.data);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        totalChecked: result.data?.totalChecked || 0,
        totalExpired: result.data?.totalExpired || 0,
        expiredOrganizations: result.data?.expiredOrganizations || [],
      },
    });
  } catch (error) {
    logger.error('check-trial-expiry-cron', 'Unexpected error in cron job', error);
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

// Prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
