/**
 * Cron Job API Route: Monthly Billing Run
 * POST /api/cron/monthly-billing
 *
 * Creates invoices for all active organizations whose billing date has arrived.
 * Uses Morning (Green Invoice) API via app-billing service.
 *
 * Security: Protected by cronGuard (CRON_SECRET)
 *
 * Recommended schedule: 1st of each month at 06:00 UTC (08:00 Israel time)
 * vercel.json: { "path": "/api/cron/monthly-billing", "schedule": "0 6 1 * *" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cronGuard } from '@/lib/api-cron-guard';
import { runMonthlyBilling } from '@/lib/services/monthly-billing-run';

async function POSTHandler(_request: NextRequest) {
  const result = await runMonthlyBilling();

  const status = result.success ? 200 : 500;

  return NextResponse.json(result, { status });
}

export const POST = cronGuard(POSTHandler);

export const dynamic = 'force-dynamic';
export const revalidate = 0;
