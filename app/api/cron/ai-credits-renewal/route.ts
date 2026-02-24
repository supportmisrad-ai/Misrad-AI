/**
 * Cron Job API Route: Monthly AI Credits Renewal
 * POST /api/cron/ai-credits-renewal
 *
 * Resets AI credits for all active organizations based on their subscription plan.
 * Credits are SET (not added) to the plan's monthly allocation.
 * Unused credits do NOT carry over.
 *
 * Security: Protected by cronGuard (CRON_SECRET)
 *
 * Recommended schedule: 1st of each month at 05:00 UTC (07:00 Israel time)
 * vercel.json: { "path": "/api/cron/ai-credits-renewal", "schedule": "0 5 1 * *" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cronGuard } from '@/lib/api-cron-guard';
import prisma from '@/lib/prisma';
import { BILLING_PACKAGES, type PackageType } from '@/lib/billing/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_PLANS = new Set<string>(Object.keys(BILLING_PACKAGES));

function getCreditsForPlan(plan: string | null | undefined): number | null {
  if (!plan || !VALID_PLANS.has(plan)) return null;
  return BILLING_PACKAGES[plan as PackageType]?.aiCreditsCents ?? null;
}

async function POSTHandler(_request: NextRequest) {
  const start = Date.now();
  const results = {
    success: true,
    renewed: 0,
    skipped: 0,
    errors: [] as string[],
    durationMs: 0,
  };

  try {
    const orgs = await prisma.organization.findMany({
      where: {
        subscription_status: { in: ['active', 'trial'] },
      },
      select: {
        id: true,
        name: true,
        subscription_plan: true,
        ai_credits_balance_cents: true,
      },
    });

    for (const org of orgs) {
      try {
        const credits = getCreditsForPlan(org.subscription_plan);

        if (credits === null) {
          results.skipped++;
          continue;
        }

        await prisma.organization.update({
          where: { id: org.id },
          data: { ai_credits_balance_cents: BigInt(credits) },
        });

        results.renewed++;
      } catch (err: unknown) {
        results.errors.push(`${org.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err: unknown) {
    results.success = false;
    results.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  results.durationMs = Date.now() - start;

  console.log(
    `[ai-credits-renewal] renewed=${results.renewed} skipped=${results.skipped} errors=${results.errors.length} duration=${results.durationMs}ms`
  );

  return NextResponse.json(results, { status: results.success ? 200 : 500 });
}

export const POST = cronGuard(POSTHandler);
