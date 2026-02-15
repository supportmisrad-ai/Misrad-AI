import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { blockE2eInProduction } from '@/lib/api-e2e-guard';

import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride, withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const blocked = blockE2eInProduction();
  if (blocked) return blocked;

  try {
    const expected = process.env.E2E_API_KEY;
    const provided = req.headers.get('x-e2e-key');

    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'NoAuthSession' }, { status: 401 });
    }

    await withTenantIsolationContext(
      {
        suppressReporting: true,
        reason: 'e2e_prisma_tenant_guard_probe',
        source: 'e2e_prisma_tenant_guard_probe',
      },
      async () =>
        prisma.systemLead.findMany(
          withPrismaTenantIsolationOverride(
            {},
            {
              reason: 'e2e_prisma_tenant_guard_probe',
              suppressReporting: true,
              source: 'e2e_prisma_tenant_guard_probe',
            }
          )
        )
    );

    return NextResponse.json(
      {
        ok: false,
        error: 'Expected Prisma tenant guard to block unscoped query, but it did not.',
      },
      { status: 500 }
    );
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'string'
          ? e
          : e && typeof e === 'object' && 'message' in e
            ? String((e as { message?: unknown }).message || 'Unknown error')
            : 'Unknown error';
    return NextResponse.json(
      {
        ok: true,
        blocked: true,
        error: msg,
      },
      { status: 500 }
    );
  }
}
