import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getErrorStatus } from '@/lib/server/workspace-access/utils';

export const runtime = 'nodejs';

async function GETHandler(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  const resolvedParams = await Promise.resolve(params as unknown);
  const orgSlug = typeof (resolvedParams as { orgSlug?: unknown } | null)?.orgSlug === 'string'
    ? String((resolvedParams as { orgSlug: string }).orgSlug)
    : '';

  if (!orgSlug) {
    return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
  }

  try {
    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    const organizationId = String(workspace.id);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [org, usedAgg] = await prisma.$transaction([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { ai_credits_balance_cents: true },
      }),
      prisma.ai_usage_logs.aggregate({
        where: {
          organization_id: organizationId,
          status: 'success',
          created_at: { gte: periodStart },
        },
        _sum: { charged_cents: true },
      }),
    ]);

    const balance = org?.ai_credits_balance_cents ?? BigInt(0);
    const balanceCents = typeof balance === 'bigint' ? balance : BigInt(Number(balance) || 0);
    const used = usedAgg?._sum?.charged_cents ?? 0;
    const usedCents = BigInt(Number(used) || 0);

    return NextResponse.json({
      balance_cents: String(balanceCents),
      used_this_month_cents: String(usedCents),
      period_start: periodStart.toISOString(),
    });
  } catch (e: unknown) {
    const status = getErrorStatus(e) ?? 403;
    const isProd = process.env.NODE_ENV === 'production';
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ...(isProd ? {} : { error }) }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
