import { NextResponse } from 'next/server';
import prisma, { PRISMA_ACCELERATE_ENABLED } from '@/lib/prisma';
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
    const raw = await (prisma.$queryRawUnsafe as any)?.('SELECT 1 as ok') ?? 'skipped_raw';
    results.rawQueryTest = raw === 'skipped_raw' ? 'skipped (raw blocked)' : 'ok';
  } catch (e: any) {
    results.rawQueryTest = `error: ${e?.message?.substring(0, 200)}`;
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
  } catch (e: any) {
    results.landingTestimonialsTest = `error: ${e?.message?.substring(0, 500)}`;
    results.landingTestimonialsErrorName = e?.name;
    results.landingTestimonialsErrorCode = e?.code;
  }

  // Test 3: landing_testimonials WITHOUT withTenantIsolationContext
  try {
    const rows = await prisma.landing_testimonials.findMany({
      where: { is_active: true },
      select: { id: true },
      take: 1,
    });
    results.testimonialsNoGuardTest = `ok (${rows.length} rows)`;
  } catch (e: any) {
    results.testimonialsNoGuardTest = `error: ${e?.message?.substring(0, 500)}`;
    results.testimonialsNoGuardErrorName = e?.name;
    results.testimonialsNoGuardErrorCode = e?.code;
  }

  // Test 4: core_system_settings (table that should definitely exist)
  try {
    const row = await prisma.coreSystemSettings.findFirst({ select: { key: true } });
    results.coreSystemSettingsTest = row ? `ok (key=${row.key})` : 'ok (empty)';
  } catch (e: any) {
    results.coreSystemSettingsTest = `error: ${e?.message?.substring(0, 500)}`;
  }

  // Test 5: profiles table
  try {
    const count = await prisma.profile.count();
    results.profilesTest = `ok (${count} rows)`;
  } catch (e: any) {
    results.profilesTest = `error: ${e?.message?.substring(0, 500)}`;
  }

  return NextResponse.json(results, { status: 200 });
}
