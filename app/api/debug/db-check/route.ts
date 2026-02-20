import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTenantIsolationContext, withPrismaTenantIsolationOverride } from '@/lib/prisma-tenant-guard';
import { getEffectiveDatabaseUrlForPrisma } from '@/lib/prisma-database-url';

/**
 * Public diagnostic endpoint — tests critical DB tables in PROD.
 * Uses Prisma model counts only (no raw SQL) to avoid tenant guard blocks.
 * Hit this endpoint in PROD to see which tables exist and their row counts.
 */
export const dynamic = 'force-dynamic';

const OVERRIDE_CTX = { suppressReporting: true, reason: 'db_diagnostic_check', source: 'api-debug-db-check' } as const;

async function safeCount(fn: () => Promise<number>): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const count = await fn();
    return { ok: true, count };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Strip lengthy Prisma error — first 300 chars is enough to diagnose
    return { ok: false, error: msg.slice(0, 300) };
  }
}

export async function GET() {
  const effectiveUrl = getEffectiveDatabaseUrlForPrisma();
  const isAccelerateUrl = Boolean(
    effectiveUrl && (effectiveUrl.startsWith('prisma://') || effectiveUrl.startsWith('prisma+postgres://'))
  );

  const checks = await withTenantIsolationContext(
    { suppressReporting: true, reason: 'db_diagnostic_check', source: 'api-debug-db-check', isSuperAdmin: true, mode: 'global_admin' },
    async () => ({
      // ── Auth-critical ────────────────────────────────────
      organization_users: await safeCount(() =>
        prisma.organizationUser.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),
      organizations: await safeCount(() =>
        prisma.organization.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),

      // ── System ───────────────────────────────────────────
      core_system_settings: await safeCount(() =>
        prisma.coreSystemSettings.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),

      // ── Landing (added after v2.0.0 launch) ─────────────
      landing_testimonials: await safeCount(() =>
        prisma.landing_testimonials.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),
      landing_faq: await safeCount(() =>
        prisma.landing_faq.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),

      // ── Nexus tables ─────────────────────────────────────
      nexus_tasks: await safeCount(() =>
        prisma.nexusTask.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),
      nexus_time_entries: await safeCount(() =>
        prisma.nexusTimeEntry.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),

      // ── Billing ──────────────────────────────────────────
      billing_events: await safeCount(() =>
        prisma.billing_events.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),

      // ── Partners (used in org creation) ─────────────────
      partners: await safeCount(() =>
        prisma.partner.count(withPrismaTenantIsolationOverride({}, OVERRIDE_CTX))
      ),
    })
  );

  const failed = Object.entries(checks).filter(([, v]) => !v.ok);
  const passed = Object.entries(checks).filter(([, v]) => v.ok);

  const dbRegion = (() => {
    const url = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
    if (url.includes('ap-northeast-2')) return 'PROD-Korea';
    if (url.includes('ap-south-1')) return 'DEV-India';
    return 'UNKNOWN';
  })();

  return NextResponse.json({
    summary: failed.length === 0 ? 'ALL_OK' : `${failed.length}_TABLES_FAILED`,
    nodeEnv: process.env.NODE_ENV,
    dbRegion,
    prisma: {
      effectiveProtocol: effectiveUrl ? effectiveUrl.slice(0, effectiveUrl.indexOf('://') + 3) : null,
      accelerateEnabled: isAccelerateUrl,
    },
    passed: passed.map(([k, v]) => ({ table: k, count: v.count })),
    failed: failed.map(([k, v]) => ({ table: k, error: v.error })),
  });
}
