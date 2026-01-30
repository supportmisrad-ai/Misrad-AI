/**
 * Prisma Client Singleton
 * 
 * This file ensures we only create one instance of Prisma Client
 * to avoid connection pool exhaustion in development (hot-reload)
 * 
 * Usage:
 *   import prisma from '@/lib/prisma';
 *   const users = await prisma.nexusUser.findMany();
 */

import { Prisma, PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { installPrismaTenantGuard } from './prisma-tenant-guard';

type _PrismaClientSanity = {
  systemLead: PrismaClient['systemLead'];
  nexusTask: PrismaClient['nexusTask'];
  systemInvoice: PrismaClient['systemInvoice'];
  systemLeadActivity: PrismaClient['systemLeadActivity'];
  nexusClient: PrismaClient['nexusClient'];
  operationsProject: PrismaClient['operationsProject'];
  operationsWorkOrder: PrismaClient['operationsWorkOrder'];
  misradClient: PrismaClient['misradClient'];
  misradInvoice: PrismaClient['misradInvoice'];
  misradMeetingAnalysisResult: PrismaClient['misradMeetingAnalysisResult'];
  misradActivityLog: PrismaClient['misradActivityLog'];
};

type _SystemLeadWhere = Parameters<_PrismaClientSanity['systemLead']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _SystemLeadCreateData = Parameters<_PrismaClientSanity['systemLead']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _Assert<T extends boolean> = T;
type _HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
type _HasSomeKey<T, K extends PropertyKey> = [Extract<keyof T, K>] extends [never] ? false : true;

// If these fail, Prisma Client was generated from a schema that doesn't match prisma/schema.prisma.
// Fix by running: npm run prisma:generate (and restart TS server).
type _AssertSystemLeadWhereHasOrgId = _Assert<_HasKey<NonNullable<_SystemLeadWhere>, 'organizationId'>>;
type _AssertSystemLeadCreateHasOrgId = _Assert<_HasKey<_SystemLeadCreateData, 'organizationId'>>;

type _NexusTaskWhere = Parameters<_PrismaClientSanity['nexusTask']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _NexusTaskCreateData = Parameters<_PrismaClientSanity['nexusTask']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertNexusTaskWhereHasOrgId = _Assert<_HasKey<NonNullable<_NexusTaskWhere>, 'organizationId'>>;
type _AssertNexusTaskCreateHasOrgId = _Assert<_HasKey<_NexusTaskCreateData, 'organizationId'>>;

// NOTE: SystemInvoice uses a nullable organizationId in the schema.
// Some Prisma delegate signatures can be hard to infer via Parameters<...> (generic arg extraction).
// Use generated input types directly to keep the safety assertion stable.
type _SystemInvoiceWhere = Parameters<_PrismaClientSanity['systemInvoice']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _SystemInvoiceCreateData = Parameters<_PrismaClientSanity['systemInvoice']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertSystemInvoiceWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_SystemInvoiceWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertSystemInvoiceCreateHasOrgId = _Assert<
  _HasSomeKey<_SystemInvoiceCreateData, 'organizationId' | 'organization_id'>
>;

type _SystemLeadActivityWhere = Parameters<_PrismaClientSanity['systemLeadActivity']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _SystemLeadActivityCreateData = Parameters<_PrismaClientSanity['systemLeadActivity']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertSystemLeadActivityWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_SystemLeadActivityWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertSystemLeadActivityCreateHasOrgId = _Assert<
  _HasSomeKey<_SystemLeadActivityCreateData, 'organizationId' | 'organization_id'>
>;

type _NexusClientWhere = Parameters<_PrismaClientSanity['nexusClient']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _NexusClientCreateData = Parameters<_PrismaClientSanity['nexusClient']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertNexusClientWhereHasOrgId = _Assert<_HasSomeKey<NonNullable<_NexusClientWhere>, 'organizationId' | 'organization_id'>>;
type _AssertNexusClientCreateHasOrgId = _Assert<_HasSomeKey<_NexusClientCreateData, 'organizationId' | 'organization_id'>>;

type _OperationsProjectWhere = Parameters<_PrismaClientSanity['operationsProject']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _OperationsProjectCreateData = Parameters<_PrismaClientSanity['operationsProject']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertOperationsProjectWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_OperationsProjectWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertOperationsProjectCreateHasOrgId = _Assert<_HasSomeKey<_OperationsProjectCreateData, 'organizationId' | 'organization_id'>>;

type _OperationsWorkOrderWhere = Parameters<_PrismaClientSanity['operationsWorkOrder']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _OperationsWorkOrderCreateData = Parameters<_PrismaClientSanity['operationsWorkOrder']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertOperationsWorkOrderWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_OperationsWorkOrderWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertOperationsWorkOrderCreateHasOrgId = _Assert<
  _HasSomeKey<_OperationsWorkOrderCreateData, 'organizationId' | 'organization_id'>
>;

type _MisradClientWhere = Parameters<_PrismaClientSanity['misradClient']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _MisradClientCreateData = Parameters<_PrismaClientSanity['misradClient']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertMisradClientWhereHasOrgId = _Assert<_HasSomeKey<NonNullable<_MisradClientWhere>, 'organizationId' | 'organization_id'>>;
type _AssertMisradClientCreateHasOrgId = _Assert<_HasSomeKey<_MisradClientCreateData, 'organizationId' | 'organization_id'>>;

type _MisradInvoiceWhere = Parameters<_PrismaClientSanity['misradInvoice']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _MisradInvoiceCreateData = Parameters<_PrismaClientSanity['misradInvoice']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertMisradInvoiceWhereHasOrgId = _Assert<_HasSomeKey<NonNullable<_MisradInvoiceWhere>, 'organizationId' | 'organization_id'>>;
type _AssertMisradInvoiceCreateHasOrgId = _Assert<_HasSomeKey<_MisradInvoiceCreateData, 'organizationId' | 'organization_id'>>;

type _MisradMeetingAnalysisResultWhere = Parameters<_PrismaClientSanity['misradMeetingAnalysisResult']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _MisradMeetingAnalysisResultCreateData = Parameters<_PrismaClientSanity['misradMeetingAnalysisResult']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertMisradMeetingAnalysisResultWhereHasOrgId = _Assert<
  _HasSomeKey<NonNullable<_MisradMeetingAnalysisResultWhere>, 'organizationId' | 'organization_id'>
>;
type _AssertMisradMeetingAnalysisResultCreateHasOrgId = _Assert<
  _HasSomeKey<_MisradMeetingAnalysisResultCreateData, 'organizationId' | 'organization_id'>
>;

type _MisradActivityLogWhere = Parameters<_PrismaClientSanity['misradActivityLog']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _MisradActivityLogCreateData = Parameters<_PrismaClientSanity['misradActivityLog']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertMisradActivityLogWhereHasOrgId = _Assert<_HasSomeKey<NonNullable<_MisradActivityLogWhere>, 'organizationId' | 'organization_id'>>;
type _AssertMisradActivityLogCreateHasOrgId = _Assert<_HasSomeKey<_MisradActivityLogCreateData, 'organizationId' | 'organization_id'>>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaTenantGuardInstalled: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

const _rawQueryUnsafe = (prisma as any).$queryRawUnsafe?.bind(prisma);
const _rawExecuteUnsafe = (prisma as any).$executeRawUnsafe?.bind(prisma);
const _rawQuery = (prisma as any).$queryRaw?.bind(prisma);
const _rawExecute = (prisma as any).$executeRaw?.bind(prisma);

function captureTenantIsolation(params: {
  message: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}): void {
  try {
    const err = new Error(params.message);
    Sentry.withScope((scope) => {
      scope.setTag('TenantIsolation', 'true');
      if (params.tags) {
        for (const [k, v] of Object.entries(params.tags)) scope.setTag(k, v);
      }
      if (params.extra) {
        for (const [k, v] of Object.entries(params.extra)) scope.setExtra(k, v);
      }
      Sentry.captureException(err);
    });
  } catch {
    // ignore
  }
}

const RAW_SQL_AUDIT_ENABLED =
  process.env.NODE_ENV === 'production' || String(process.env.RAW_SQL_AUDIT || '').toLowerCase() === 'true';

const RAW_SQL_UNSCOPED_FORBIDDEN =
  process.env.NODE_ENV === 'production' &&
  (String(process.env.RAW_SQL_UNSCOPED_FORBIDDEN || '').toLowerCase() === 'true' ||
    String(process.env.RAW_SQL_UNSCOPED_FORBIDDEN || '').toLowerCase() === '1');

function normalizeStackPath(p: string): string {
  return String(p || '').replaceAll('\\', '/').replaceAll('\r', '').trim();
}

function extractCallerFileFromStack(stack: string | undefined): string | null {
  const s = String(stack || '');
  if (!s) return null;

  const lines = s.split('\n').map((x) => x.trim()).filter(Boolean);
  for (const line of lines) {
    const mParen = line.match(/\((.*?):\d+:\d+\)$/);
    const mBare = line.match(/at\s+([^\s]+?):\d+:\d+$/);
    const fileRaw = mParen?.[1] ?? mBare?.[1];
    if (!fileRaw) continue;

    const file = normalizeStackPath(fileRaw);
    if (!file) continue;
    if (file.includes('/node_modules/')) continue;
    if (file.includes('/internal/')) continue;
    if (file.endsWith('/lib/prisma.ts')) continue;
    if (file.includes('/lib/prisma.ts:')) continue;

    return file;
  }
  return null;
}

function hash32(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function fingerprintSql(query: string): string {
  const normalized = String(query || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return hash32(normalized);
}

function auditRawSqlUsage(params: {
  kind: 'scoped' | 'allowlisted_unscoped';
  reason: string;
  scopeColumn?: 'organization_id' | 'tenant_id';
  scopeId?: string;
  query: string;
  values: unknown[];
}): void {
  if (!RAW_SQL_AUDIT_ENABLED) return;

  try {
    const stack = new Error().stack;
    const callerFile = extractCallerFileFromStack(stack);

    const query = String(params.query || '');
    const values = Array.isArray(params.values) ? params.values : [];

    const placeholders = Array.from(query.matchAll(/\$(\d+)/g)).map((m) => Number(m[1])).filter((n) => Number.isFinite(n));
    const placeholderMax = placeholders.length ? Math.max(...placeholders) : 0;

    const extra: Record<string, unknown> = {
      raw_kind: params.kind,
      reason: String(params.reason || '').trim(),
      scopeColumn: params.scopeColumn ?? null,
      scopeId: params.scopeId ?? null,
      callerFile,
      queryLen: query.length,
      valuesCount: values.length,
      placeholderMax,
      queryFingerprint: fingerprintSql(query),
      nodeEnv: process.env.NODE_ENV,
    };

    Sentry.withScope((scope) => {
      scope.setTag('security_event', 'prisma_raw_sql_used');
      scope.setTag('raw_kind', params.kind);
      scope.setTag('raw_reason', String(params.reason || '').trim());
      if (callerFile) scope.setTag('raw_caller_file', callerFile);
      if (params.scopeColumn) scope.setTag('raw_scope_column', params.scopeColumn);
      scope.setLevel('warning');
      for (const [k, v] of Object.entries(extra)) scope.setExtra(k, v);
      Sentry.captureMessage('Prisma raw SQL used', 'warning');
    });
  } catch {
    // ignore
  }
}

function throwTenantIsolation(params: {
  message: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}): never {
  captureTenantIsolation(params);
  throw new Error(params.message);
}

function assertRawScopeParams(params: {
  scopeColumn: 'organization_id' | 'tenant_id';
  scopeId: string;
  reason: string;
  query: string;
  values: unknown[];
}) {
  const scopeId = String(params.scopeId || '').trim();
  const reason = String(params.reason || '').trim();
  const query = String(params.query || '');
  const values = Array.isArray(params.values) ? params.values : [];

  if (!reason) {
    throwTenantIsolation({
      message: '[TenantIsolation] Raw SQL blocked: missing reason.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  }
  if (!scopeId) {
    throwTenantIsolation({
      message: `[TenantIsolation] Raw SQL blocked: missing ${params.scopeColumn} scopeId.`,
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
      extra: { scopeColumn: params.scopeColumn },
    });
  }

  const col = params.scopeColumn;

  // Hard requirement: the scoped column must appear in the SQL query AND be tied to a placeholder.
  // We accept a few common SQL shapes (WHERE/JOIN/UPDATE SET/INSERT columns list), but we do NOT
  // accept a query that merely mentions the column without binding it to a parameter.
  //
  // This regex matches:
  // - organization_id = $1
  // - t.organization_id::uuid = $2
  // - insert into ... (organization_id, ...) values ($1, ...)
  // by requiring the placeholder appears close to the column mention.
  const placeholderNearColumnRe = new RegExp(
    `(?:\\b\\w+\\.)?${col}\\b[\\s\\S]{0,1500}?\\$(\\d+)`,
    'gi'
  );
  const matches = Array.from(query.matchAll(placeholderNearColumnRe));

  if (matches.length === 0) {
    throwTenantIsolation({
      message: `[TenantIsolation] Raw SQL blocked: missing ${col} scoping placeholder in query. Use scoped raw helpers only. (reason=${reason})`,
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
      extra: { scopeColumn: col, scopeId, reason },
    });
  }

  for (const m of matches) {
    const idx = Number(m[1]);
    if (!Number.isFinite(idx) || idx <= 0) {
      throwTenantIsolation({
        message: `[TenantIsolation] Raw SQL blocked: invalid placeholder for ${col}.`,
        tags: { tenant_isolation_source: 'prisma_raw_sql' },
        extra: { scopeColumn: col, reason },
      });
    }
    const v = values[idx - 1];
    if (String(v ?? '').trim() !== scopeId) {
      throwTenantIsolation({
        message: `[TenantIsolation] Raw SQL blocked: ${col} placeholder $${idx} does not match scopeId. (reason=${reason})`,
        tags: { tenant_isolation_source: 'prisma_raw_sql' },
        extra: { scopeColumn: col, scopeId, reason, placeholder: `$${idx}` },
      });
    }
  }
}

function assertSqlObject(sql: any): asserts sql is { sql: string; values: unknown[] } {
  if (!sql || typeof sql !== 'object') {
    throw new Error('[TenantIsolation] Raw SQL blocked: missing Prisma.Sql object');
  }
  if (typeof (sql as any).sql !== 'string') {
    throw new Error('[TenantIsolation] Raw SQL blocked: Prisma.Sql missing .sql string');
  }
  if (!Array.isArray((sql as any).values)) {
    throw new Error('[TenantIsolation] Raw SQL blocked: Prisma.Sql missing .values array');
  }
}

export async function queryRawOrgScopedSql<T>(
  db: any,
  params: { organizationId: string; reason: string; sql: Prisma.Sql }
): Promise<T> {
  assertSqlObject(params.sql);
  return queryRawOrgScoped<T>(db, {
    organizationId: params.organizationId,
    reason: params.reason,
    query: params.sql.sql,
    values: params.sql.values,
  });
}

export async function executeRawOrgScopedSql(
  db: any,
  params: { organizationId: string; reason: string; sql: Prisma.Sql }
): Promise<number> {
  assertSqlObject(params.sql);
  return executeRawOrgScoped(db, {
    organizationId: params.organizationId,
    reason: params.reason,
    query: params.sql.sql,
    values: params.sql.values,
  });
}

export async function queryRawTenantScopedSql<T>(
  db: any,
  params: { tenantId: string; reason: string; sql: Prisma.Sql }
): Promise<T> {
  assertSqlObject(params.sql);
  return queryRawTenantScoped<T>(db, {
    tenantId: params.tenantId,
    reason: params.reason,
    query: params.sql.sql,
    values: params.sql.values,
  });
}

export async function executeRawTenantScopedSql(
  db: any,
  params: { tenantId: string; reason: string; sql: Prisma.Sql }
): Promise<number> {
  assertSqlObject(params.sql);
  return executeRawTenantScoped(db, {
    tenantId: params.tenantId,
    reason: params.reason,
    query: params.sql.sql,
    values: params.sql.values,
  });
}

export async function queryRawScoped<T>(
  db: any,
  params: {
    scopeColumn: 'organization_id' | 'tenant_id';
    scopeId: string;
    reason: string;
    query: string;
    values: unknown[];
  }
): Promise<T> {
  const queryFn = db === prisma ? _rawQueryUnsafe : (db as any)?.$queryRawUnsafe;
  if (typeof queryFn !== 'function') {
    throwTenantIsolation({
      message: '[TenantIsolation] Raw SQL blocked: db client does not support $queryRawUnsafe.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  }
  assertRawScopeParams(params);
  auditRawSqlUsage({
    kind: 'scoped',
    reason: params.reason,
    scopeColumn: params.scopeColumn,
    scopeId: params.scopeId,
    query: params.query,
    values: params.values,
  });
  return queryFn(params.query, ...params.values);
}

export async function executeRawScoped(
  db: any,
  params: {
    scopeColumn: 'organization_id' | 'tenant_id';
    scopeId: string;
    reason: string;
    query: string;
    values: unknown[];
  }
): Promise<number> {
  const execFn = db === prisma ? _rawExecuteUnsafe : (db as any)?.$executeRawUnsafe;
  if (typeof execFn !== 'function') {
    throwTenantIsolation({
      message: '[TenantIsolation] Raw SQL blocked: db client does not support $executeRawUnsafe.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  }
  assertRawScopeParams(params);
  auditRawSqlUsage({
    kind: 'scoped',
    reason: params.reason,
    scopeColumn: params.scopeColumn,
    scopeId: params.scopeId,
    query: params.query,
    values: params.values,
  });
  return execFn(params.query, ...params.values);
}

export async function queryRawOrgScoped<T>(
  db: any,
  params: { organizationId: string; reason: string; query: string; values: unknown[] }
): Promise<T> {
  return queryRawScoped<T>(db, {
    scopeColumn: 'organization_id',
    scopeId: params.organizationId,
    reason: params.reason,
    query: params.query,
    values: params.values,
  });
}

export async function executeRawOrgScoped(
  db: any,
  params: { organizationId: string; reason: string; query: string; values: unknown[] }
): Promise<number> {
  return executeRawScoped(db, {
    scopeColumn: 'organization_id',
    scopeId: params.organizationId,
    reason: params.reason,
    query: params.query,
    values: params.values,
  });
}

export async function queryRawTenantScoped<T>(
  db: any,
  params: { tenantId: string; reason: string; query: string; values: unknown[] }
): Promise<T> {
  return queryRawScoped<T>(db, {
    scopeColumn: 'tenant_id',
    scopeId: params.tenantId,
    reason: params.reason,
    query: params.query,
    values: params.values,
  });
}

export async function executeRawTenantScoped(
  db: any,
  params: { tenantId: string; reason: string; query: string; values: unknown[] }
): Promise<number> {
  return executeRawScoped(db, {
    scopeColumn: 'tenant_id',
    scopeId: params.tenantId,
    reason: params.reason,
    query: params.query,
    values: params.values,
  });
}

const RAW_SQL_UNSCOPED_ALLOWLIST = new Map<string, RegExp[]>([
  [
    'ops_portal_token_lookup',
    [
      /\bfrom\s+operations_contractor_tokens\b/i,
      /\btoken_hash\b\s*=\s*\$1\b/i,
      /\blimit\s+1\b/i,
    ],
  ],
  [
    'social_navigation_menu_list',
    [
      /\bselect\b[\s\S]*\bfrom\s+navigation_menu\b/i,
      /\bwhere\b[\s\S]*\bis_visible\b\s*=\s*true\b/i,
      /\border\s+by\b[\s\S]*\bsection\b/i,
      /\border\s+by\b[\s\S]*\border\b/i,
    ],
  ],
  [
    'admin_notifications_list_all',
    [
      /\bselect\b[\s\S]*\bfrom\s+notifications\b/i,
      /\bwhere\b[\s\S]*\btarget_type\b\s*=\s*\$1\b/i,
      /\border\s+by\s+created_at\s+desc\b/i,
      /\blimit\s+50\b/i,
    ],
  ],
  [
    'admin_notifications_list_target',
    [
      /\bselect\b[\s\S]*\bfrom\s+notifications\b/i,
      /\bwhere\b[\s\S]*\btarget_type\b\s*=\s*\$1\b/i,
      /\band\b[\s\S]*\btarget_id\b\s*=\s*\$2\b/i,
      /\border\s+by\s+created_at\s+desc\b/i,
      /\blimit\s+50\b/i,
    ],
  ],
  [
    'admin_metrics_client_clients_agg',
    [
      /\bselect\b[\s\S]*\bfrom\s+client_clients\b/i,
      /\bsum\([\s\S]*metadata->>'monthlyfee'[\s\S]*\)::numeric/i,
      /\bcount\(\*\)\s*filter\s*\(\s*where\s+coalesce\(metadata->>'status',[\s\S]*\)\s*=\s*'active'\s*\)/i,
      /\bcount\(\*\)\s*filter\s*\(\s*where\s+coalesce\(metadata->>'paymentstatus',[\s\S]*\)\s*=\s*'overdue'\s*\)/i,
    ],
  ],
  [
    'admin_cockpit_client_clients_agg',
    [
      /\bselect\b[\s\S]*\bfrom\s+client_clients\b/i,
      /\bcount\(\*\)\s*filter\s*\(\s*where\s+coalesce\(metadata->>'status',[\s\S]*\)\s*=\s*'active'\s*\)\s+as\s+active_clients_online\b/i,
      /\bsum\([\s\S]*metadata->>'monthlyfee'[\s\S]*\)::numeric/i,
    ],
  ],
]);

function assertUnscopedRawAllowed(params: { reason: string; query: string; values: unknown[] }) {
  const reason = String(params.reason || '').trim();
  const query = String(params.query || '');
  const values = Array.isArray(params.values) ? params.values : [];

  if (!reason) {
    throwTenantIsolation({
      message: '[TenantIsolation] Raw SQL blocked: missing reason.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  }

  const patterns = RAW_SQL_UNSCOPED_ALLOWLIST.get(reason);
  if (!patterns) {
    throwTenantIsolation({
      message: `[TenantIsolation] Raw SQL blocked: unscoped raw SQL reason is not allowlisted. (reason=${reason})`,
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
      extra: { reason },
    });
  }

  for (const re of patterns) {
    if (!re.test(query)) {
      throwTenantIsolation({
        message: `[TenantIsolation] Raw SQL blocked: unscoped raw SQL query does not match required pattern. (reason=${reason})`,
        tags: { tenant_isolation_source: 'prisma_raw_sql' },
        extra: { reason, pattern: String(re) },
      });
    }
  }

  const placeholders = Array.from(query.matchAll(/\$(\d+)/g))
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));
  const placeholderMax = placeholders.length ? Math.max(...placeholders) : 0;
  if (placeholderMax > 0 && values.length < placeholderMax) {
    throwTenantIsolation({
      message: `[TenantIsolation] Raw SQL blocked: unscoped raw SQL values do not satisfy placeholders. (reason=${reason})`,
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
      extra: { reason, placeholderMax, valuesCount: values.length },
    });
  }
  if (placeholderMax > 0) {
    for (let i = 0; i < placeholderMax; i++) {
      if (String(values[i] ?? '').trim().length === 0) {
        throwTenantIsolation({
          message: `[TenantIsolation] Raw SQL blocked: unscoped raw SQL has empty placeholder value. (reason=${reason})`,
          tags: { tenant_isolation_source: 'prisma_raw_sql' },
          extra: { reason, placeholderIndex: i + 1 },
        });
      }
    }
  }
}

export async function queryRawAllowlisted<T>(
  db: any,
  params: {
    reason: string;
    query: string;
    values: unknown[];
  }
): Promise<T> {
  const queryFn = db === prisma ? _rawQueryUnsafe : (db as any)?.$queryRawUnsafe;
  if (typeof queryFn !== 'function') {
    throwTenantIsolation({
      message: '[TenantIsolation] Raw SQL blocked: db client does not support $queryRawUnsafe.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  }

  if (RAW_SQL_UNSCOPED_FORBIDDEN) {
    throwTenantIsolation({
      message:
        '[TenantIsolation] Raw SQL blocked: unscoped raw SQL is forbidden in production. Use queryRawOrgScoped/queryRawTenantScoped only.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
      extra: { reason: String(params?.reason || '').trim() || null },
    });
  }

  assertUnscopedRawAllowed({ reason: params.reason, query: params.query, values: params.values });
  auditRawSqlUsage({
    kind: 'allowlisted_unscoped',
    reason: params.reason,
    query: params.query,
    values: params.values,
  });
  return queryFn(params.query, ...params.values);
}

if (!globalForPrisma.prismaTenantGuardInstalled) {
  installPrismaTenantGuard(prisma);

  globalForPrisma.prismaTenantGuardInstalled = true;
}

if (typeof _rawQueryUnsafe === 'function') {
  (prisma as any).$queryRawUnsafe = (query: string, ...args: any[]) => {
    const allowlist = [/^SELECT \* FROM "auth"."token"/i];
    if (allowlist.some((pattern) => pattern.test(query))) {
      return _rawQueryUnsafe(query, ...args);
    }
    throw new Error('[TenantIsolation] Prisma $queryRawUnsafe is blocked. Use queryRawOrgScoped/queryRawTenantScoped.');
  };
}
if (typeof _rawExecuteUnsafe === 'function') {
  (prisma as any).$executeRawUnsafe = (query: string, ...args: any[]) => {
    const allowlist = [/^SELECT \* FROM "auth"."token"/i];
    if (allowlist.some((pattern) => pattern.test(query))) {
      return _rawExecuteUnsafe(query, ...args);
    }
    throw new Error('[TenantIsolation] Prisma $executeRawUnsafe is blocked. Use executeRawOrgScoped/executeRawTenantScoped.');
  };
}
if (typeof _rawQuery === 'function') {
  (prisma as any).$queryRaw = () => {
    throwTenantIsolation({
      message: '[TenantIsolation] Prisma $queryRaw is blocked. Use queryRawOrgScoped/queryRawTenantScoped.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  };
}
if (typeof _rawExecute === 'function') {
  (prisma as any).$executeRaw = () => {
    throwTenantIsolation({
      message: '[TenantIsolation] Prisma $executeRaw is blocked. Use executeRawOrgScoped/executeRawTenantScoped.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  };
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

