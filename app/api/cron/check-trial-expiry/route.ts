import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { checkAndDisableExpiredOrganizations } from '@/lib/services/check-expired-trials';
import { cronGuard } from '@/lib/api-cron-guard';

/**
 * Cron Job API Route: Check and disable expired trials
 *
 * Security: Protected by cronGuard (CRON_SECRET + tenant isolation global_admin)
 *
 * Recommended schedule: Daily at 2 AM (0 2 * * *)
 */
async function handler(_request: NextRequest) {
  try {
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

export const GET = cronGuard(handler);
export const POST = cronGuard(handler);

export const dynamic = 'force-dynamic';
export const revalidate = 0;
