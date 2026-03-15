import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { sendTrialExpiryWarnings } from '@/lib/services/check-expired-trials';
import { cronGuard } from '@/lib/api-cron-guard';
import { cronConnectionGuard } from '@/lib/api-cron-connection-guard';

/**
 * Cron Job API Route: Send trial expiry warning emails
 *
 * Security: Protected by cronGuard (CRON_SECRET + tenant isolation global_admin)
 *
 * Recommended schedule: Twice daily at 9 AM and 5 PM (0 9,17 * * *)
 */
async function handler(_request: NextRequest) {
  try {
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

const GETHandler = handler;

export const GET = cronGuard(cronConnectionGuard(GETHandler, { critical: false, maxConcurrent: 3 }));
export const POST = cronGuard(cronConnectionGuard(GETHandler, { critical: false, maxConcurrent: 3 }));

export const dynamic = 'force-dynamic';
export const revalidate = 0;
