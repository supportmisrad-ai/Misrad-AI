/**
 * Prisma Client Singleton
 *
 * This file ensures we only create one instance of Prisma Client
 * to avoid connection pool exhaustion in development (hot-reload)
 *
 * Usage:
 *   import prisma from '@/lib/prisma';
 *   const users = await prisma.nexusUser.findMany();
 *
 * Architecture:
 *   lib/prisma.ts                  — Singleton + guards + re-exports (this file)
 *   lib/prisma-type-assertions.ts  — Compile-time schema safety checks
 *   lib/prisma-database-url.ts     — DATABASE_URL resolution logic
 *   lib/prisma-raw-sql.ts          — Tenant-isolated raw SQL helpers
 */

// Side-effect import: compile-time type safety assertions.
// If this import causes type errors, run: npm run prisma:generate
import '@/lib/prisma-type-assertions';

import { Prisma, PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as Sentry from '@sentry/nextjs';
import { installPrismaTenantGuard } from '@/lib/prisma-tenant-guard';
import { asObject } from '@/lib/shared/unknown';
import { getEffectiveDatabaseUrlForPrisma } from '@/lib/prisma-database-url';
import {
  setRawSqlOriginals,
  throwTenantIsolation,
  type RawSqlClient,
  type RawQueryUnsafe,
  type RawExecuteUnsafe,
} from '@/lib/prisma-raw-sql';

// Re-export all raw SQL helpers so consumers keep importing from '@/lib/prisma'
export {
  queryRawScoped,
  executeRawScoped,
  queryRawOrgScoped,
  executeRawOrgScoped,
  queryRawTenantScoped,
  executeRawTenantScoped,
  queryRawOrgScopedSql,
  executeRawOrgScopedSql,
  queryRawTenantScopedSql,
  executeRawTenantScopedSql,
  queryRawAllowlisted,
  executeRawAllowlisted,
} from '@/lib/prisma-raw-sql';

// ═══════════════════════════════════════════════════════════════════
// Safety: block MISRAD_ALLOW_SCHEMA_FALLBACKS in non-E2E environments
// ═══════════════════════════════════════════════════════════════════

const _allowSchemaFallbacks = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '')
  .trim()
  .toLowerCase() === 'true';
const _isE2e = String(process.env.IS_E2E_TESTING || '').trim().toLowerCase() === 'true';

if (_allowSchemaFallbacks && !_isE2e) {
  try {
    Sentry.captureMessage(
      'MISRAD_ALLOW_SCHEMA_FALLBACKS is enabled (blocked)',
      'fatal'
    );
  } catch {
    // ignore
  }
  throw new Error('[Safety] MISRAD_ALLOW_SCHEMA_FALLBACKS cannot be enabled. Use IS_E2E_TESTING only.');
}

if (_allowSchemaFallbacks && _isE2e) {
  process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS = 'false';
}

// ═══════════════════════════════════════════════════════════════════
// Global declarations for HMR-safe singleton
// ═══════════════════════════════════════════════════════════════════

declare global {
  var __MISRAD_PRISMA_CLIENT__: PrismaClient | undefined;
  var __MISRAD_PRISMA_TENANT_GUARD_INSTALLED__: boolean | undefined;
  var __MISRAD_PRISMA_DATASOURCE_URL__: string | undefined;
  var __MISRAD_PRISMA_DIRECT_CLIENT__: PrismaClient | undefined;
}

// ═══════════════════════════════════════════════════════════════════
// Client singleton creation
// ═══════════════════════════════════════════════════════════════════

const _effectiveDatabaseUrl = getEffectiveDatabaseUrlForPrisma();

if (!_effectiveDatabaseUrl) {
  throw new Error(
    'Missing required environment variable DATABASE_URL. Add DATABASE_URL to .env.local (or your hosting provider env vars) and restart the server.'
  );
}

const _isAccelerateUrl = _effectiveDatabaseUrl.startsWith('prisma://') || _effectiveDatabaseUrl.startsWith('prisma+postgres://');

// Startup diagnostics — log pool config once (sanitized, no credentials)
{
  const _safeProtocol = _effectiveDatabaseUrl.slice(0, _effectiveDatabaseUrl.indexOf('://') + 3);
  const _isPooler = _effectiveDatabaseUrl.toLowerCase().includes('pooler');
  const _connLimit = (() => { try { return new URL(_effectiveDatabaseUrl).searchParams.get('connection_limit'); } catch { return null; } })();
  const _poolTimeout = (() => { try { return new URL(_effectiveDatabaseUrl).searchParams.get('pool_timeout'); } catch { return null; } })();
  console.log(
    `[Prisma] protocol=${_safeProtocol} accelerate=${_isAccelerateUrl} pooler=${_isPooler} connection_limit=${_connLimit ?? 'default'} pool_timeout=${_poolTimeout ?? 'default'}`,
  );
}

// The no-engine Prisma Client only accepts prisma:// protocol.
// Prisma Console may provide prisma+postgres:// — normalize it.
// We also update process.env.DATABASE_URL because Prisma reads env("DATABASE_URL")
// directly from the schema at validation time, not just from constructor options.
const _normalizedDatabaseUrl = _effectiveDatabaseUrl.startsWith('prisma+postgres://')
  ? _effectiveDatabaseUrl.replace('prisma+postgres://', 'prisma://')
  : _effectiveDatabaseUrl;

if (_isAccelerateUrl && _normalizedDatabaseUrl !== _effectiveDatabaseUrl) {
  process.env.DATABASE_URL = _normalizedDatabaseUrl;
}

const _prismaClientOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  ...(_normalizedDatabaseUrl ? { datasources: { db: { url: _normalizedDatabaseUrl } } } : {}),
};

let _client = globalThis.__MISRAD_PRISMA_CLIENT__;
const _existingUrl = globalThis.__MISRAD_PRISMA_DATASOURCE_URL__;

// In development, HMR can keep a stale PrismaClient instance across reloads.
// If DATABASE_URL changed (e.g. switching from direct DB to pooler), recreate the client.
if (_client && _existingUrl !== _effectiveDatabaseUrl) {
  _client.$disconnect().catch(() => undefined);
  _client = undefined;
}
if (!_client) {
  const _baseClient = new PrismaClient(_prismaClientOptions);
  // When using Prisma Accelerate (prisma+postgres:// URL), apply the extension
  // to enable managed connection pooling, edge caching, and proper protocol handling.
  // Requires `prisma generate --no-engine` so the client accepts prisma+postgres:// URLs.
  // Without prisma:// URL, the client works exactly as before (backward compatible).
  _client = _isAccelerateUrl
    ? _baseClient.$extends(withAccelerate()) as unknown as PrismaClient
    : _baseClient;
  globalThis.__MISRAD_PRISMA_CLIENT__ = _client;
  globalThis.__MISRAD_PRISMA_DATASOURCE_URL__ = _effectiveDatabaseUrl;
}

export const PRISMA_ACCELERATE_ENABLED: boolean = _isAccelerateUrl;

type _SocialMediaInvoiceDelegate = PrismaClient extends { socialMediaInvoice: infer D }
  ? D
  : PrismaClient extends { social_invoices: infer D }
    ? D
    : never;

type PrismaClientWithAliases = PrismaClient & {
  organization: PrismaClient['organization'];
  organizationUser: PrismaClient['organizationUser'];
  teamMember: PrismaClient['teamMember'];
  teamMemberClient: PrismaClient['teamMemberClient'];
  socialMediaInvoice: _SocialMediaInvoiceDelegate;
  billing_invoices: PrismaClient['billing_invoices'];
  attendanceMonthlyReport: PrismaClient['attendanceMonthlyReport'];
  attendanceSalaryConfig: PrismaClient['attendanceSalaryConfig'];
  misradSalesTeam: PrismaClient['misradSalesTeam'];
  misradSalesTeamMember: PrismaClient['misradSalesTeamMember'];
  misradFieldTeam: PrismaClient['misradFieldTeam'];
  misradFieldAgent: PrismaClient['misradFieldAgent'];
  misradFieldVisit: PrismaClient['misradFieldVisit'];
  siteAnalyticsSession: PrismaClient['siteAnalyticsSession'];
  siteAnalyticsPageView: PrismaClient['siteAnalyticsPageView'];
  siteAnalyticsEvent: PrismaClient['siteAnalyticsEvent'];
};

const _basePrismaClient = _client;

export const prisma: PrismaClientWithAliases = Object.assign(_basePrismaClient, {
  organization: _basePrismaClient.organization,
  organizationUser: _basePrismaClient.organizationUser,
  teamMember: _basePrismaClient.teamMember,
  teamMemberClient: _basePrismaClient.teamMemberClient,
  socialMediaInvoice: (_basePrismaClient as unknown as Record<string, unknown>).socialMediaInvoice ?? (_basePrismaClient as unknown as Record<string, unknown>).social_invoices,
  billing_invoices: _basePrismaClient.billing_invoices,
  attendanceMonthlyReport: _basePrismaClient.attendanceMonthlyReport,
  attendanceSalaryConfig: _basePrismaClient.attendanceSalaryConfig,
  misradSalesTeam: _basePrismaClient.misradSalesTeam,
  misradSalesTeamMember: _basePrismaClient.misradSalesTeamMember,
  misradFieldTeam: _basePrismaClient.misradFieldTeam,
  misradFieldAgent: _basePrismaClient.misradFieldAgent,
  misradFieldVisit: _basePrismaClient.misradFieldVisit,
  siteAnalyticsSession: _basePrismaClient.siteAnalyticsSession,
  siteAnalyticsPageView: _basePrismaClient.siteAnalyticsPageView,
  siteAnalyticsEvent: _basePrismaClient.siteAnalyticsEvent,
});

// ═══════════════════════════════════════════════════════════════════
// Raw SQL monkey-patching: discover originals and pass to sub-module,
// then install guards on the client instance.
// ═══════════════════════════════════════════════════════════════════

const prismaRaw: RawSqlClient = prisma;
const prismaRawProto = (asObject(Object.getPrototypeOf(prismaRaw)) ?? {}) as RawSqlClient;
const prismaClientProto = (asObject(PrismaClient.prototype) ?? {}) as RawSqlClient;

// IMPORTANT: in dev/HMR the instance methods may already be patched/guarded.
// Prefer prototype methods that Prisma defines on PrismaClient.prototype.
const _rawQueryUnsafeOriginal: RawQueryUnsafe | undefined =
  prismaClientProto?.$queryRawUnsafe ?? prismaRawProto?.$queryRawUnsafe ?? prismaRaw.$queryRawUnsafe;
const _rawExecuteUnsafeOriginal: RawExecuteUnsafe | undefined =
  prismaClientProto?.$executeRawUnsafe ?? prismaRawProto?.$executeRawUnsafe ?? prismaRaw.$executeRawUnsafe;
const _rawQueryOriginal = prismaClientProto?.$queryRaw ?? prismaRawProto?.$queryRaw ?? prismaRaw.$queryRaw;
const _rawExecuteOriginal = prismaClientProto?.$executeRaw ?? prismaRawProto?.$executeRaw ?? prismaRaw.$executeRaw;

// Pass the originals to prisma-raw-sql so scoped helpers can bypass the guards
setRawSqlOriginals(_rawQueryUnsafeOriginal, _rawExecuteUnsafeOriginal);

// ── Tenant guard ──
// Note: Prisma Accelerate (engine=none with $extends) does not support $use middleware.
// When using Accelerate, tenant isolation must be enforced through RLS policies in the database.

if (!globalThis.__MISRAD_PRISMA_TENANT_GUARD_INSTALLED__) {
  if (_isAccelerateUrl) {
    console.warn(
      '[Prisma] Tenant guard middleware skipped (Prisma Accelerate enabled). ' +
      'Ensure tenant isolation is enforced via database RLS policies.'
    );
  } else {
    installPrismaTenantGuard(prisma);
  }
  globalThis.__MISRAD_PRISMA_TENANT_GUARD_INSTALLED__ = true;
}

if (typeof _rawQueryUnsafeOriginal === 'function') {
  prismaRaw.$queryRawUnsafe = ((query: string, ...args: unknown[]) => {
    const allowlist = [
      /^SELECT \* FROM "auth"\."token"/i,
      /\bset\s+local\s+role\s+authenticated\b/i,
      /\bset_config\(\s*'role'\s*,\s*'authenticated'\s*,\s*true\s*\)\s*/i,
      /\bset_config\(\s*'request\.jwt\.claims'\s*,/i,
      /\bpublic\.current_organization_id\(\)[\s\S]*\bfrom\s+public\.organizations\b/i,
      // Public Leads API - api_keys validation
      /\bSELECT\b[\s\S]*\bFROM\s+api_keys\b[\s\S]*\bWHERE\s+key\s*=\s*\$1\b/i,
      // Public Leads API - rate limiting
      /\bSELECT\b[\s\S]*\bFROM\s+api_rate_limits\b[\s\S]*\bWHERE\s+key\s*=\s*\$1\b/i,
      // Scoped queries (notifications, etc.)
      /\borganization_id::uuid\s*=\s*\$\d+\b/i,
      /\borganization_id\s*=\s*\$\d+::uuid\b/i,
    ];
    if (allowlist.some((pattern) => pattern.test(query))) {
      return Reflect.apply(_rawQueryUnsafeOriginal, prismaRaw, [query, ...args]) as Prisma.PrismaPromise<unknown>;
    }
    throw new Error('[TenantIsolation] Prisma $queryRawUnsafe is blocked. Use queryRawOrgScoped/queryRawTenantScoped.');
  }) as typeof prismaRaw.$queryRawUnsafe;
}
if (typeof _rawExecuteUnsafeOriginal === 'function') {
  const guardedExecuteRawUnsafe: RawExecuteUnsafe = function (
    this: unknown,
    query: string,
    ...args: unknown[]
  ): Prisma.PrismaPromise<number> {
    const allowlist = [
      /^SELECT \* FROM "auth"\."token"/i,
      /\bset\s+local\s+role\s+authenticated\b/i,
      /\bset_config\(\s*'role'\s*,\s*'authenticated'\s*,\s*true\s*\)\s*/i,
      /\bset_config\(\s*'request\.jwt\.claims'\s*,/i,
      /\bpublic\.current_organization_id\(\)[\s\S]*\bfrom\s+public\.organizations\b/i,
      // Public Leads API - update last used timestamp
      /\bUPDATE\s+api_keys\s+SET\s+last_used_at\b/i,
      // Public Leads API - rate limiting cleanup
      /\bDELETE\s+FROM\s+api_rate_limits\b[\s\S]*\bWHERE\s+expires_at\s*<\s*NOW\(\)\b/i,
      // Public Leads API - rate limiting update
      /\bUPDATE\s+api_rate_limits\s+SET\s+count\b/i,
      // Public Leads API - rate limiting insert
      /\bINSERT\s+INTO\s+api_rate_limits\b/i,
    ];
    if (allowlist.some((pattern) => pattern.test(query))) {
      return Reflect.apply(_rawExecuteUnsafeOriginal, this, [query, ...args]) as Prisma.PrismaPromise<number>;
    }
    throw new Error('[TenantIsolation] Prisma $executeRawUnsafe is blocked. Use executeRawOrgScoped/executeRawTenantScoped.');
  };

  prismaRaw.$executeRawUnsafe = guardedExecuteRawUnsafe;
}
if (typeof _rawQueryOriginal === 'function') {
  prismaRaw.$queryRaw = () => {
    throwTenantIsolation({
      message: '[TenantIsolation] Prisma $queryRaw is blocked. Use queryRawOrgScoped/queryRawTenantScoped.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  };
}
if (typeof _rawExecuteOriginal === 'function') {
  prismaRaw.$executeRaw = () => {
    throwTenantIsolation({
      message: '[TenantIsolation] Prisma $executeRaw is blocked. Use executeRawOrgScoped/executeRawTenantScoped.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  };
}

// ═══════════════════════════════════════════════════════════════════
// Interactive transaction guardrail: detect accidental use of pooled
// client for interactive transactions (async callback style).
// Batch transactions (array of operations) are safe through pooler.
// ═══════════════════════════════════════════════════════════════════

{
  const _isPoolerUrl = _effectiveDatabaseUrl.toLowerCase().includes('pooler');
  if (_isPoolerUrl && !_isAccelerateUrl && _client) {
    const _guardTarget = _client;
    const _originalTransaction = _guardTarget.$transaction.bind(_guardTarget);
    (_guardTarget as unknown as Record<string, unknown>).$transaction = function (
      ...args: unknown[]
    ): unknown {
      const firstArg = args[0];
      if (typeof firstArg === 'function') {
        const err = new Error(
          '[Prisma][Pooler Guard] Interactive $transaction detected on pooled client. ' +
          'Use prismaForInteractiveTransaction().$transaction() instead to avoid PgBouncer ' +
          '"Transaction not found" errors. Stack trace attached for debugging.'
        );
        if (process.env.NODE_ENV === 'production') {
          try { Sentry.captureException(err); } catch { /* ignore */ }
          console.error(err.message);
        } else {
          console.error(err.message, '\n', err.stack);
        }
      }
      return Reflect.apply(_originalTransaction, _guardTarget, args);
    };
  }
}

if (process.env.NODE_ENV !== 'production') globalThis.__MISRAD_PRISMA_CLIENT__ = prisma;

function getDirectUrlForInteractiveTransactions(): string | null {
  const directUrl = String(process.env.DIRECT_URL || '').trim();
  if (!directUrl) return null;

  try {
    const u = new URL(directUrl);
    const host = String(u.hostname || '').toLowerCase();
    if (host.includes('pooler')) return null;
  } catch {
    // not a valid URL — skip
  }
  return directUrl;
}

function getOrCreateDirectClient(): PrismaClient {
  const directUrl = getDirectUrlForInteractiveTransactions();
  if (!directUrl) return _basePrismaClient;

  let directClient = globalThis.__MISRAD_PRISMA_DIRECT_CLIENT__;
  if (directClient) return directClient;

  directClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: { db: { url: directUrl } },
  });
  globalThis.__MISRAD_PRISMA_DIRECT_CLIENT__ = directClient;
  return directClient;
}

export function prismaForInteractiveTransaction(): PrismaClient {
  // Prisma Accelerate supports interactive transactions (since 5.8.0) and manages
  // connection pooling properly, so no need for a separate direct client.
  if (_isAccelerateUrl) return _basePrismaClient;
  return getOrCreateDirectClient();
}

/**
 * Returns `cacheStrategy` options for Prisma Accelerate.
 * When Accelerate is not enabled (no prisma:// URL), returns `undefined`
 * so the option is silently ignored by Prisma Client.
 *
 * Usage:
 *   const settings = await prisma.coreSystemSettings.findUnique({
 *     where: { key: 'landing_settings' },
 *     ...accelerateCache({ ttl: 60, swr: 120 }),
 *   });
 */
export function accelerateCache(
  strategy: { ttl?: number; swr?: number },
): { cacheStrategy?: undefined } {
  if (!_isAccelerateUrl) return {};
  // The extended client (withAccelerate) accepts cacheStrategy at runtime.
  // The base PrismaClient types restrict it to `undefined`, so we assert here.
  // This is safe: without Accelerate the value is never set; with Accelerate it's consumed correctly.
  return { cacheStrategy: { ttl: strategy.ttl ?? 60, swr: strategy.swr } } as unknown as { cacheStrategy?: undefined };
}

export default prisma;
