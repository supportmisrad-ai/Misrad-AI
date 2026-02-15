/**
 * Prisma Raw SQL Security Layer
 *
 * Tenant-isolated raw SQL helpers that enforce scoping by organization_id or tenant_id.
 * All raw SQL must go through these helpers — direct $queryRawUnsafe / $executeRawUnsafe
 * is blocked by the guards installed in lib/prisma.ts.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { asObject } from '@/lib/shared/unknown';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

type RawQueryUnsafe = PrismaClient['$queryRawUnsafe'];
type RawExecuteUnsafe = PrismaClient['$executeRawUnsafe'];
type RawQuery = PrismaClient['$queryRaw'];
type RawExecute = PrismaClient['$executeRaw'];

type RawSqlClient = {
  $queryRawUnsafe?: RawQueryUnsafe;
  $executeRawUnsafe?: RawExecuteUnsafe;
  $queryRaw?: RawQuery;
  $executeRaw?: RawExecute;
};

export type { RawQueryUnsafe, RawExecuteUnsafe, RawQuery, RawExecute, RawSqlClient };

// ═══════════════════════════════════════════════════════════════════
// Original method storage (set by lib/prisma.ts after client creation)
// ═══════════════════════════════════════════════════════════════════

let _rawQueryUnsafeOriginal: RawQueryUnsafe | undefined;
let _rawExecuteUnsafeOriginal: RawExecuteUnsafe | undefined;

export function setRawSqlOriginals(
  queryOriginal: RawQueryUnsafe | undefined,
  executeOriginal: RawExecuteUnsafe | undefined,
): void {
  _rawQueryUnsafeOriginal = queryOriginal;
  _rawExecuteUnsafeOriginal = executeOriginal;
}

// ═══════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════

function asRawSqlClient(value: unknown): RawSqlClient | null {
  return asObject(value) as RawSqlClient | null;
}

export function getQueryRawUnsafe(db: unknown): RawQueryUnsafe | undefined {
  const client = asRawSqlClient(db);
  if (!client) return undefined;

  if (typeof _rawQueryUnsafeOriginal === 'function') {
    return _rawQueryUnsafeOriginal.bind(db) as RawQueryUnsafe;
  }

  const fn = client.$queryRawUnsafe;
  if (typeof fn !== 'function') return undefined;
  return fn.bind(client) as RawQueryUnsafe;
}

export function getExecuteRawUnsafe(db: unknown): RawExecuteUnsafe | undefined {
  const client = asRawSqlClient(db);
  if (!client) return undefined;

  if (typeof _rawExecuteUnsafeOriginal === 'function') {
    return _rawExecuteUnsafeOriginal.bind(db) as RawExecuteUnsafe;
  }

  const fn = client.$executeRawUnsafe;
  if (typeof fn !== 'function') return undefined;
  return fn.bind(client) as RawExecuteUnsafe;
}

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

function throwTenantIsolation(params: {
  message: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}): never {
  captureTenantIsolation(params);
  throw new Error(params.message);
}

export { throwTenantIsolation };

// ═══════════════════════════════════════════════════════════════════
// Raw SQL Audit
// ═══════════════════════════════════════════════════════════════════

const RAW_SQL_AUDIT_ENABLED =
  process.env.NODE_ENV === 'production' || String(process.env.RAW_SQL_AUDIT || '').toLowerCase() === 'true';

export const RAW_SQL_UNSCOPED_FORBIDDEN =
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
    if (file.endsWith('/lib/prisma-raw-sql.ts')) continue;
    if (file.includes('/lib/prisma-raw-sql.ts:')) continue;

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

// ═══════════════════════════════════════════════════════════════════
// Scope assertion
// ═══════════════════════════════════════════════════════════════════

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

  const placeholderNearColumnRe = new RegExp(
    `(?:\\b\\w+\\.)?${col}\\b(?::\\w+)?[\\s\\S]{0,1500}?\\$(\\d+)`,
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

// ═══════════════════════════════════════════════════════════════════
// Prisma.Sql helpers
// ═══════════════════════════════════════════════════════════════════

function assertSqlObject(sql: unknown): asserts sql is { sql: string; values: unknown[] } {
  const obj = asObject(sql);
  if (!obj) {
    throw new Error('[TenantIsolation] Raw SQL blocked: missing Prisma.Sql object');
  }
  if (typeof obj.sql !== 'string') {
    throw new Error('[TenantIsolation] Raw SQL blocked: Prisma.Sql missing .sql string');
  }
  if (!Array.isArray(obj.values)) {
    throw new Error('[TenantIsolation] Raw SQL blocked: Prisma.Sql missing .values array');
  }
}

function isNestedSqlObject(val: unknown): val is { strings: string[]; values: unknown[] } {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  return Array.isArray(obj.strings) && Array.isArray(obj.values);
}

function flattenPrismaSql(sql: Prisma.Sql): { query: string; values: unknown[] } {
  const flatValues: unknown[] = [];

  function resolve(s: unknown): string {
    if (!isNestedSqlObject(s)) return '';
    const strings: string[] = s.strings;
    const values: unknown[] = s.values;
    if (strings.length === 0) return '';

    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      if (isNestedSqlObject(val)) {
        result += resolve(val);
      } else {
        flatValues.push(val);
        result += `$${flatValues.length}`;
      }
      if (i + 1 < strings.length) {
        result += strings[i + 1];
      }
    }
    return result;
  }

  const query = resolve(sql);
  return { query, values: flatValues };
}

// ═══════════════════════════════════════════════════════════════════
// Unscoped allowlist
// ═══════════════════════════════════════════════════════════════════

const RAW_SQL_UNSCOPED_ALLOWLIST = new Map<string, RegExp[]>([
  [
    'e2e_rls_check_setup_role',
    [
      /\bset\s+local\s+role\s+authenticated\b/i,
    ],
  ],
  [
    'e2e_rls_check_setup_claims',
    [
      /\bset_config\(\s*'request\.jwt\.claims'\s*,\s*\$1\s*,\s*true\s*\)/i,
    ],
  ],
  [
    'health_db_check_table_exists',
    [
      /\bselect\s+1\s+from\s+[a-zA-Z0-9_]+\s+limit\s+1\b/i,
    ],
  ],
  [
    'health_db_count_table_records',
    [
      /\bselect\s+count\(\*\)::bigint\s+as\s+count\s+from\s+[a-zA-Z0-9_]+\b/i,
    ],
  ],
  [
    'e2e_rls_check_select',
    [
      /\bselect\b[\s\S]*\bpublic\.current_organization_id\(\)/i,
      /\bfrom\s+public\.organizations\b/i,
      /\bfrom\s+public\.client_clients\b/i,
      /\bfrom\s+public\.system_leads\b/i,
      /\bfrom\s+public\.social_posts\b/i,
    ],
  ],
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
  [
    'api_rate_limit_cleanup',
    [
      /\bDELETE\s+FROM\s+api_rate_limits\s+WHERE\s+expires_at\s*<\s*NOW\(\)/i,
    ],
  ],
  [
    'api_rate_limit_check',
    [
      /\bSELECT\s+count\s+FROM\s+api_rate_limits\s+WHERE\s+key\s*=\s*\$1/i,
    ],
  ],
  [
    'api_rate_limit_incr',
    [
      /\bUPDATE\s+api_rate_limits\s+SET\s+count\s*=\s*count\s*\+\s*1\s+WHERE\s+key\s*=\s*\$1/i,
    ],
  ],
  [
    'api_rate_limit_insert',
    [
      /\bINSERT\s+INTO\s+api_rate_limits\b[\s\S]*\bVALUES\b[\s\S]*\bNOW\(\)\s*\+\s*INTERVAL\s*'2\s*minutes'/i,
    ],
  ],
  [
    'api_key_check',
    [
      /\bSELECT\s+id,\s*is_active,\s*rate_limit_per_minute,\s*allowed_endpoints\b[\s\S]*\bFROM\s+api_keys\b[\s\S]*\bWHERE\s+key\s*=\s*\$1\s+AND\s+is_active\s*=\s*true/i,
    ],
  ],
  [
    'api_key_usage',
    [
      /\bUPDATE\s+api_keys\s+SET\s+last_used_at\s*=\s*NOW\(\)\s+WHERE\s+key\s*=\s*\$1/i,
    ],
  ],
]);

export function assertUnscopedRawAllowed(params: { reason: string; query: string; values: unknown[] }) {
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

// ═══════════════════════════════════════════════════════════════════
// Exported scoped query/execute helpers
// ═══════════════════════════════════════════════════════════════════

export async function queryRawScoped<T>(
  db: unknown,
  params: {
    scopeColumn: 'organization_id' | 'tenant_id';
    scopeId: string;
    reason: string;
    query: string;
    values: unknown[];
  }
): Promise<T> {
  const queryFn = getQueryRawUnsafe(db);
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
  return queryFn<T>(params.query, ...params.values);
}

export async function executeRawScoped(
  db: unknown,
  params: {
    scopeColumn: 'organization_id' | 'tenant_id';
    scopeId: string;
    reason: string;
    query: string;
    values: unknown[];
  }
): Promise<number> {
  const execFn = getExecuteRawUnsafe(db);
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
  db: unknown,
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
  db: unknown,
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
  db: unknown,
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
  db: unknown,
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

// ── Prisma.Sql tagged-template variants ──

export async function queryRawOrgScopedSql<T>(
  db: unknown,
  params: { organizationId: string; reason: string; sql: Prisma.Sql }
): Promise<T> {
  assertSqlObject(params.sql);
  const flat = flattenPrismaSql(params.sql);
  return queryRawOrgScoped<T>(db, {
    organizationId: params.organizationId,
    reason: params.reason,
    query: flat.query,
    values: flat.values,
  });
}

export async function executeRawOrgScopedSql(
  db: unknown,
  params: { organizationId: string; reason: string; sql: Prisma.Sql }
): Promise<number> {
  assertSqlObject(params.sql);
  const flat = flattenPrismaSql(params.sql);
  return executeRawOrgScoped(db, {
    organizationId: params.organizationId,
    reason: params.reason,
    query: flat.query,
    values: flat.values,
  });
}

export async function queryRawTenantScopedSql<T>(
  db: unknown,
  params: { tenantId: string; reason: string; sql: Prisma.Sql }
): Promise<T> {
  assertSqlObject(params.sql);
  const flat = flattenPrismaSql(params.sql);
  return queryRawTenantScoped<T>(db, {
    tenantId: params.tenantId,
    reason: params.reason,
    query: flat.query,
    values: flat.values,
  });
}

export async function executeRawTenantScopedSql(
  db: unknown,
  params: { tenantId: string; reason: string; sql: Prisma.Sql }
): Promise<number> {
  assertSqlObject(params.sql);
  const flat = flattenPrismaSql(params.sql);
  return executeRawTenantScoped(db, {
    tenantId: params.tenantId,
    reason: params.reason,
    query: flat.query,
    values: flat.values,
  });
}

// ── Allowlisted unscoped queries ──

export async function queryRawAllowlisted<T>(
  db: unknown,
  params: {
    reason: string;
    query: string;
    values: unknown[];
  }
): Promise<T> {
  const queryFn = getQueryRawUnsafe(db);
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
  return queryFn<T>(params.query, ...params.values);
}

export async function executeRawAllowlisted(
  db: unknown,
  params: {
    reason: string;
    query: string;
    values: unknown[];
  }
): Promise<number> {
  const execFn = getExecuteRawUnsafe(db);
  if (typeof execFn !== 'function') {
    throwTenantIsolation({
      message: '[TenantIsolation] Raw SQL blocked: db client does not support $executeRawUnsafe.',
      tags: { tenant_isolation_source: 'prisma_raw_sql' },
    });
  }

  if (RAW_SQL_UNSCOPED_FORBIDDEN) {
    throwTenantIsolation({
      message:
        '[TenantIsolation] Raw SQL blocked: unscoped raw SQL is forbidden in production. Use executeRawOrgScoped/executeRawTenantScoped only.',
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
  return execFn(params.query, ...params.values);
}
