import { NextResponse } from 'next/server';
import prisma, { PRISMA_ACCELERATE_ENABLED, queryRawAllowlisted } from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireSuperAdmin(); } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    accelerateEnabled: PRISMA_ACCELERATE_ENABLED,
    databaseUrlPrefix: (process.env.DATABASE_URL || '').substring(0, 30),
    directUrlPrefix: (process.env.DIRECT_URL || '').substring(0, 30),
  };

  // Test 1: Basic connection via raw query
  try {
    const raw = await queryRawAllowlisted<Array<{ ok: number }>>(prisma, {
      reason: 'debug_db_health_connection_test',
      query: 'SELECT 1 as ok',
      values: [],
    });
    results.rawQueryTest = Array.isArray(raw) && raw.length > 0 ? 'ok' : 'empty';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    results.rawQueryTest = `error: ${msg.substring(0, 200)}`;
  }

  // Test 2: landing_testimonials via Prisma model
  try {
    const count = await withTenantIsolationContext(
      { source: 'debug_db_health', reason: 'health_check', suppressReporting: true },
      async () => {
        const rows = await prisma.landing_testimonials.findMany({
          where: { is_active: true },
          select: { id: true },
          take: 1,
        });
        return rows.length;
      }
    );
    results.landingTestimonialsTest = `ok (${count} rows)`;
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const errObj = e as Record<string, unknown>;
    results.landingTestimonialsTest = `error: ${err.message.substring(0, 500)}`;
    results.landingTestimonialsErrorName = err.name;
    results.landingTestimonialsErrorCode = errObj?.code;
  }

  // Test 3: landing_testimonials WITHOUT withTenantIsolationContext
  try {
    const rows = await prisma.landing_testimonials.findMany({
      where: { is_active: true },
      select: { id: true },
      take: 1,
    });
    results.testimonialsNoGuardTest = `ok (${rows.length} rows)`;
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const errObj = e as Record<string, unknown>;
    results.testimonialsNoGuardTest = `error: ${err.message.substring(0, 500)}`;
    results.testimonialsNoGuardErrorName = err.name;
    results.testimonialsNoGuardErrorCode = errObj?.code;
  }

  // Test 4: core_system_settings (table that should definitely exist)
  try {
    const row = await prisma.coreSystemSettings.findFirst({ select: { key: true } });
    results.coreSystemSettingsTest = row ? `ok (key=${row.key})` : 'ok (empty)';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    results.coreSystemSettingsTest = `error: ${msg.substring(0, 500)}`;
  }

  // Test 5: profiles table
  try {
    const count = await prisma.profile.count();
    results.profilesTest = `ok (${count} rows)`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    results.profilesTest = `error: ${msg.substring(0, 500)}`;
  }

  return NextResponse.json(results, { status: 200 });
}
