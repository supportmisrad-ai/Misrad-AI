import 'server-only';

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';

const DEBUG_SUPABASE = process.env.DEBUG_SUPABASE === 'true' && process.env.NODE_ENV !== 'production';
const SUPABASE_SECURITY_LOGS = process.env.SUPABASE_SECURITY_LOGS === 'true';
const IS_PROD = process.env.NODE_ENV === 'production';

type UnknownRecord = Record<string, unknown>;
type AnyFn = (...args: unknown[]) => unknown;

function getErrorName(error: unknown): string | null {
  if (error instanceof Error) return error.name;
  const obj = asObject(error);
  const name = obj?.name;
  return typeof name === 'string' ? name : null;
}

const SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENABLED =
  process.env.SUPABASE_PRISMA_FIRST_RUNTIME_GUARD !== 'false' &&
  process.env.SUPABASE_PRISMA_FIRST_ALLOW_UNSAFE_DB !== 'true';

const SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENFORCE = true;

const SUPABASE_PRISMA_FIRST_REPORT_BLOCKED_IN_DEV =
  process.env.SUPABASE_PRISMA_FIRST_REPORT_BLOCKED_IN_DEV !== 'false' && process.env.NODE_ENV !== 'production';

function supabaseDebugLog(...args: unknown[]) {
  if (DEBUG_SUPABASE) console.log(...args);
}

function supabaseDebugWarn(...args: unknown[]) {
  if (DEBUG_SUPABASE || String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true') console.warn(...args);
}

function supabaseErrorLog(message: string, meta?: unknown, error?: unknown) {
  if (DEBUG_SUPABASE) {
    if (error) {
      console.error(message, meta, error);
    } else if (meta !== undefined) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  }

  if (IS_PROD) {
    console.error(message);
    return;
  }

  if (error) {
    console.error(message, meta, error);
  } else if (meta !== undefined) {
    console.error(message, meta);
  } else {
    console.error(message);
  }
}

function supabaseSecurityWarn(message: string, meta?: unknown) {
  if (process.env.NODE_ENV !== 'production' || SUPABASE_SECURITY_LOGS) {
    if (meta !== undefined) console.warn(message, meta);
    else console.warn(message);
  }
}

const ORG_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeBase64UrlToUtf8(input: string): string {
  const b64 = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');

  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }
  } catch {
    // ignore
  }

  if (typeof atob !== 'function') {
    throw new Error('[Supabase] JWT decode failed: no decoder available');
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function parseJwtPayload(token: string): unknown {
  const t = String(token || '').trim();
  const parts = t.split('.');
  if (parts.length < 2) {
    throw new Error('[Supabase] Invalid JWT format (missing payload)');
  }

  const json = decodeBase64UrlToUtf8(parts[1]);
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('[Supabase] Invalid JWT payload JSON');
  }
}

function extractOrganizationIdFromJwtClaims(claims: unknown): string | null {
  const root = asObject(claims);
  const orgObj = asObject(root?.org);
  const metadata = asObject(root?.metadata);
  const publicMetadata = asObject(root?.public_metadata);
  const appMetadata = asObject(root?.app_metadata);

  const candidates = [
    root?.organization_id,
    root?.org_id,
    root?.orgId,
    orgObj?.id,
    metadata?.organization_id,
    publicMetadata?.organization_id,
    appMetadata?.organization_id,
  ];

  for (const c of candidates) {
    const v = String(c ?? '').trim();
    if (!v) continue;
    if (ORG_UUID_REGEX.test(v)) return v;
    return null;
  }

  return null;
}

export function assertClerkSupabaseJwtHasOrganizationId(token: string, context: string) {
  const t = String(token || '').trim();
  if (!t) return;

  const payload = parseJwtPayload(t);
  const orgId = extractOrganizationIdFromJwtClaims(payload);

  if (!orgId) {
    const msg =
      `[Supabase] חסר/לא תקין organization_id ב-JWT של Clerk שנשלח ל-Supabase. ` +
      `ה-RLS תלוי בזה (current_organization_id()). Context: ${context}`;

    // In E2E we allow DB-based fallback resolution (e.g., via social_users/profiles by clerk_user_id).
    if (String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true') {
      supabaseDebugWarn(msg);
      return;
    }

    throw new Error(msg);
  }
}

async function reportServiceRoleUsage(params: {
  kind: 'unscoped' | 'scoped';
  reason: string;
  scopeColumn?: 'organization_id';
  scopeId?: string;
}) {
  try {
    const reason = String(params.reason || '').trim();
    const scopeColumn = params.scopeColumn;
    const scopeId = params.scopeId ? String(params.scopeId) : undefined;

    const meta = {
      kind: params.kind,
      reason,
      scope: scopeColumn && scopeId ? `${scopeColumn}=${scopeId}` : null,
      ts: new Date().toISOString(),
    };

    supabaseSecurityWarn('[Supabase][ServiceRole]', meta);

    try {
      const { headers } = await import('next/headers');
      const h = await headers();
      const requestMeta = {
        ip: h.get('x-forwarded-for') || h.get('x-real-ip') || null,
        ua: h.get('user-agent') || null,
        referer: h.get('referer') || null,
      };
      supabaseSecurityWarn('[Supabase][ServiceRole][RequestMeta]', { ...meta, ...requestMeta });
    } catch {
      // ignore
    }

    try {
      const Sentry = (await import('@sentry/nextjs')) as unknown;
      const sentryObj = asObject(Sentry);
      const withScope = sentryObj?.withScope;
      const captureMessage = sentryObj?.captureMessage;
      if (typeof withScope === 'function') {
        withScope((scope: unknown) => {
          try {
            const scopeObj = asObject(scope);
            const setTag = scopeObj?.setTag;
            const setExtra = scopeObj?.setExtra;
            if (typeof setTag === 'function') {
              setTag('security_event', 'supabase_service_role_client_created');
              setTag('supabase_service_role_kind', String(params.kind));
            }
            if (typeof setExtra === 'function') {
              setExtra('supabase_service_role_reason', reason);
              if (scopeColumn) setExtra('supabase_service_role_scope_column', scopeColumn);
              if (scopeId) setExtra('supabase_service_role_scope_id', scopeId);
            }
          } catch {
            // ignore
          }
          if (typeof captureMessage === 'function') {
            captureMessage('Supabase Service Role client created', 'warning');
          }
        });
      }
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

const ALLOWED_SERVICE_ROLE_UNSCOPED_REASONS = new Set<string>([
  'app_version_manifest_read',
  'app_binary_signed_url',
  'auth_find_user_global_by_email',
  'clerk_webhook_invite_lookup',
  'clerk_webhook_sync_user',
  'clerk_webhook_team_member_sync',
  'clerk_webhook_user_deleted',
  'cron_abandoned_signups_followup',
  'e2e_tenant_isolation_seed',
  'e2e_storage_cross_org_seed',
  'e2e_rls_check_resolve_org',
  'device_login_pairing_token_consume',
  'employee_invite_token_lookup',
  'employee_invite_finalize',
  'health_check_test_write',
  'health_check_tables',
  'integrations_onboard_client_resolve_org',
  'kiosk_pairing_create_or_refresh',
  'kiosk_pairing_status',
  'landing_upload_public_assets',
  'storage_upload_default',
  'storage_test_admin',
  'storage_upload_global_branding',
  'system_flags_resolve_tenant',
  'system_maintenance_mode_update',
  'tenants_admin_list',
  'tenants_api_key_create',
  'tenants_super_admin_create',
  'tenants_super_admin_delete',
  'tenants_super_admin_update',
  'tenants_update_metadata',
]);

const ALLOWED_SERVICE_ROLE_SCOPED_REASONS = new Set<string>([
  'cron_abandoned_signups_followup_write',
  'clerk_webhook_sync_user_scoped',
  'clerk_webhook_user_deleted_scoped',
  'clerk_webhook_team_member_sync_scoped',
  'device_login_pairing_token_consume',
  'employee_invite_finalize_org',
  'integrations_onboard_client',
  'kiosk_pairing_admin_create',
  'kiosk_pairing_approve',
  'kiosk_pairing_status_update',
  'workspace_user_ensure_profile_org',
  'ops_portal_attachment_upload',
  'ops_portal_signature_upload',
  'ops_work_order_attachment_upload',
  'ops_work_order_signature_upload',
  'storage_upload_org_scoped',
]);

function assertServiceRoleReasonAllowed(params: {
  reason: string;
  kind: 'unscoped' | 'scoped';
}) {
  const reason = String(params.reason || '').trim();
  if (!reason) {
    throw new Error('[Supabase] Service Role blocked: missing reason');
  }

  const allow =
    params.kind === 'unscoped'
      ? ALLOWED_SERVICE_ROLE_UNSCOPED_REASONS.has(reason)
      : ALLOWED_SERVICE_ROLE_SCOPED_REASONS.has(reason);

  if (!allow) {
    try {
      const callerFile = extractCallerFileFromStack(new Error().stack, 'lib/supabase.ts');
      void (async () => {
        try {
          const Sentry = (await import('@sentry/nextjs')) as unknown;
          const sentryObj = asObject(Sentry);
          const withScope = sentryObj?.withScope;
          const captureMessage = sentryObj?.captureMessage;
          if (typeof withScope === 'function') {
            withScope((scope: unknown) => {
              try {
                const scopeObj = asObject(scope);
                const setTag = scopeObj?.setTag;
                const setExtra = scopeObj?.setExtra;
                const setLevel = scopeObj?.setLevel;
                if (typeof setTag === 'function') {
                  setTag('security_event', 'SecurityBreach');
                  setTag('security_breach_kind', 'supabase_service_role_reason_not_allowlisted');
                  setTag('supabase_service_role_kind', String(params.kind));
                  setTag('supabase_service_role_reason', reason);
                  if (callerFile) setTag('supabase_service_role_caller_file', callerFile);
                }
                if (typeof setExtra === 'function') {
                  setExtra('service_role_blocked', {
                    kind: params.kind,
                    reason,
                    callerFile,
                  });
                }
                if (typeof setLevel === 'function') {
                  setLevel('fatal');
                }
              } catch {
              }

              if (typeof captureMessage === 'function') {
                captureMessage('Supabase Service Role blocked (reason not allowlisted)', 'fatal');
              }
            });
          }
        } catch {
        }
      })();
    } catch {
    }

    throw new Error(`[Supabase] Service Role blocked: reason is not allowlisted: ${reason}`);
  }
}

// Type guard to verify Supabase client
function isValidSupabaseClient(client: unknown): client is SupabaseClient {
  const obj = asObject(client);
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.from === 'function'
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Service Role key for server-side operations (bypasses RLS)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type SupabaseStorageClient = Pick<SupabaseClient, 'storage'>;

function wrapStorageOnlyClient(client: SupabaseClient, label: string): SupabaseStorageClient {
  const clientObj = asObject(client) ?? {};
  const originalFrom = clientObj.from;
  const originalRpc = clientObj.rpc;
  const originalSchema = clientObj.schema;
  const originalRest = clientObj.rest;

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from' && typeof originalFrom === 'function') {
        return (table: string) => {
          throw new Error(
            '[Supabase] Storage-only client: PostgREST .from(...) is blocked. ' +
              `label=${String(label)} table=${String(table || '')}`
          );
        };
      }

      if (prop === 'rpc' && typeof originalRpc === 'function') {
        return (fn: string) => {
          throw new Error(
            '[Supabase] Storage-only client: PostgREST .rpc(...) is blocked. ' +
              `label=${String(label)} rpc=${String(fn || '')}`
          );
        };
      }

      if (prop === 'schema' && typeof originalSchema === 'function') {
        return (schema: string) => {
          throw new Error(
            '[Supabase] Storage-only client: PostgREST .schema(...) is blocked. ' +
              `label=${String(label)} schema=${String(schema || '')}`
          );
        };
      }

      if (prop === 'rest' && originalRest) {
        throw new Error('[Supabase] Storage-only client: PostgREST rest client is blocked. ' + `label=${String(label)}`);
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseStorageClient;
}

type ClerkTokenProvider = () => Promise<string | null | undefined>;

export type CreateClientOptions = {

  useServiceRole?: boolean;
};

function normalizeStackPath(p: string): string {
  return String(p || '')
    .replaceAll('\\', '/')
    .replaceAll('\r', '')
    .trim();
}

function extractCallerFileFromStack(stack: string | undefined, selfFileHint: string): string | null {
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
    if (file.endsWith('/' + selfFileHint)) continue;
    if (file.includes('/' + selfFileHint + ':')) continue;

    return file;
  }
  return null;
}

function isAllowedSupabaseDbCaller(file: string | null): boolean {
  const f = normalizeStackPath(String(file || ''));
  if (!f) return !IS_PROD;

  const allow = [
    '/app/api/e2e/',
    '/app/api/webhooks/',
  ];
  if (allow.some((x) => f.includes(x))) return true;

  return false;
}

function isAllowedSupabaseDbStack(stack: string | undefined): boolean {
  const s = String(stack || '');
  if (!s) return !IS_PROD;

  const allow = [
    '/app/api/e2e/',
    '/app/api/webhooks/',
  ];

  const lines = s.split('\n').map((x) => x.trim()).filter(Boolean);
  for (const line of lines) {
    const mParen = line.match(/\((.*?):\d+:\d+\)$/);
    const mBare = line.match(/at\s+([^\s]+?):\d+:\d+$/);
    const fileRaw = mParen?.[1] ?? mBare?.[1];
    if (!fileRaw) continue;
    const file = normalizeStackPath(fileRaw);
    if (!file) continue;
    if (allow.some((x) => file.includes(x))) return true;
  }

  return false;
}

function wrapServiceRoleStorageOnly(client: SupabaseClient, reason: string): SupabaseClient {
  const clientObj = asObject(client) ?? {};
  const originalFrom = clientObj.from;
  const originalRpc = clientObj.rpc;
  const originalSchema = clientObj.schema;
  const originalRest = clientObj.rest;

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from' && typeof originalFrom === 'function') {
        return (table: string) => {
          throw new Error(
            '[Supabase] Service Role blocked (Storage-only outside webhooks/e2e): ' +
              `Caller not allowed. reason=${String(reason)} table=${String(table || '')}`
          );
        };
      }

      if (prop === 'rpc' && typeof originalRpc === 'function') {
        return (fn: string) => {
          throw new Error(
            '[Supabase] Service Role blocked (Storage-only outside webhooks/e2e): ' +
              `Caller not allowed. reason=${String(reason)} rpc=${String(fn || '')}`
          );
        };
      }

      if (prop === 'schema' && typeof originalSchema === 'function') {
        return (schema: string) => {
          throw new Error(
            '[Supabase] Service Role blocked (Storage-only outside webhooks/e2e): ' +
              `Caller not allowed. reason=${String(reason)} schema=${String(schema || '')}`
          );
        };
      }

      if (prop === 'rest' && originalRest) {
        throw new Error(
          '[Supabase] Service Role blocked (Storage-only outside webhooks/e2e): ' +
            `Caller not allowed. reason=${String(reason)} rest=blocked`
        );
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient;
}

async function reportBlockedDbAccess(params: {
  callerFile: string | null;
  kind: 'from' | 'rpc';
  target: string;
}) {
  try {
    const meta = {
      kind: params.kind,
      target: params.target,
      callerFile: params.callerFile,
      ts: new Date().toISOString(),
    };
    supabaseSecurityWarn('[Supabase][PrismaFirst][BlockedDbAccess]', meta);

    if (!IS_PROD && !SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENFORCE && !SUPABASE_PRISMA_FIRST_REPORT_BLOCKED_IN_DEV) {
      return;
    }

    try {
      const Sentry = (await import('@sentry/nextjs')) as unknown;
      const sentryObj = asObject(Sentry);
      const withScope = sentryObj?.withScope;
      const captureMessage = sentryObj?.captureMessage;
      if (typeof withScope === 'function') {
        withScope((scope: unknown) => {
          try {
            const scopeObj = asObject(scope);
            const setTag = scopeObj?.setTag;
            const setExtra = scopeObj?.setExtra;
            if (typeof setTag === 'function') {
              setTag('security_event', 'supabase_prisma_first_blocked_db_access');
              setTag('supabase_db_access_kind', String(params.kind));
            }
            if (typeof setExtra === 'function') {
              setExtra('supabase_db_access_target', params.target);
              setExtra('supabase_db_access_caller_file', params.callerFile);
            }
          } catch {
            // ignore
          }
          if (typeof captureMessage === 'function') {
            captureMessage(
              'Supabase Prisma-First blocked PostgREST access',
              SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENFORCE ? 'error' : 'warning'
            );
          }
        });
      }
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

export function createBrowserClientWithClerk(tokenProvider: ClerkTokenProvider): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(IS_PROD ? 'Supabase is not configured' : 'Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!anonKey) {
    throw new Error(IS_PROD ? 'Supabase is not configured' : 'Supabase anon key not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const token = await tokenProvider();
        const headers = new Headers(init?.headers);
        if (token && String(token).length > 0) {
          assertClerkSupabaseJwtHasOrganizationId(String(token), 'browser_client_with_clerk');
          headers.set('Authorization', `Bearer ${token}`);
        }
        return fetch(input, { ...init, headers });
      },
    },
  });
};

export type ServiceRoleClientScopedParams = {
  reason: string;
  scopeColumn: 'organization_id';
  scopeId: string;
};

function createRawServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    const error = new Error(IS_PROD ? 'Supabase is not configured' : 'Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL');
    supabaseErrorLog('[Supabase]', { message: error.message });
    throw error;
  }

  if (!serviceRoleKey) {
    const error = new Error(IS_PROD ? 'Supabase is not configured' : 'Supabase SERVICE_ROLE key not configured. Please set SUPABASE_SERVICE_ROLE_KEY');
    supabaseErrorLog('[Supabase]', { message: error.message });
    throw error;
  }

  try {
    const urlHost = (() => {
      try {
        return new URL(String(url)).host;
      } catch {
        return null;
      }
    })();

    let roleClaim: string | null = null;
    try {
      const payload = asObject(parseJwtPayload(String(serviceRoleKey)));
      const role = payload?.role;
      if (role !== undefined && role !== null) roleClaim = String(role);
    } catch {
      roleClaim = null;
    }

    if (urlHost) {
      supabaseDebugWarn('[Supabase] Service Role client configured for host:', urlHost);
    }

    if (!roleClaim) {
      supabaseDebugWarn('[Supabase] SUPABASE_SERVICE_ROLE_KEY does not look like a JWT with a role claim');
      if (String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true') {
        throw new Error('[Supabase] Invalid SUPABASE_SERVICE_ROLE_KEY for E2E: expected a JWT with role=service_role');
      }
    } else {
      supabaseDebugWarn('[Supabase] SUPABASE_SERVICE_ROLE_KEY role claim:', roleClaim);
      if (roleClaim !== 'service_role') {
        throw new Error(`[Supabase] Invalid SUPABASE_SERVICE_ROLE_KEY: expected role=service_role, got role=${roleClaim}`);
      }
    }
  } catch (e) {
    throw e;
  }

  const fetchWithClerkJwt: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set('apikey', serviceRoleKey);
    headers.set('Authorization', `Bearer ${serviceRoleKey}`);
    return fetch(input, { ...init, headers });
  };

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithClerkJwt,
    },
  });
}

/**
 * @deprecated Prisma-First: אסור להשתמש ב-Service Role כדי לבצע גישה לנתונים עסקיים.
 * Service Role עוקף RLS ולכן הוא מותר רק עבור Infra/Storage/Webhooks/E2E/תחזוקה ייעודית.
 * למידע נוסף: docs/ARCHITECTURE_DECISION.md
 */
export function createServiceRoleClient(params: { reason: string; allowUnscoped: true }): SupabaseClient {
  if (!params?.allowUnscoped) {
    throw new Error('[Supabase] Refusing to create unscoped Service Role client without allowUnscoped=true');
  }

  if (!params?.reason || String(params.reason).trim().length === 0) {
    throw new Error('[Supabase] Refusing to create Service Role client without a reason');
  }

  assertServiceRoleReasonAllowed({ reason: String(params.reason), kind: 'unscoped' });

  void reportServiceRoleUsage({ kind: 'unscoped', reason: String(params.reason) });

  supabaseDebugWarn('[Supabase] Creating GLOBAL Service Role client (RLS bypassed):', String(params.reason));
  const client = createRawServiceRoleClient();
  const ok = isAllowedSupabaseDbStack(new Error().stack);
  if (!ok) {
    return wrapServiceRoleStorageOnly(client, String(params.reason));
  }
  return client;
}

function wrapScopedBuilder(params: {
  builder: unknown;
  scopeColumn: 'organization_id';
  scopeId: string;
}): unknown {
  const { builder, scopeColumn, scopeId } = params;
  if (!builder || typeof builder !== 'object') return builder;

  const wrapReturn = (val: unknown) => {
    if (val && typeof val === 'object') return wrapScopedBuilder({ builder: val, scopeColumn, scopeId });
    return val;
  };

  const ensureScopedWrite = (payload: unknown) => {
    const values = Array.isArray(payload) ? payload : [payload];
    for (const v of values) {
      if (!v || typeof v !== 'object') {
        throw new Error(`[Supabase] Service Role scoped write expects object payload (scope: ${scopeColumn}=${scopeId})`);
      }
      const obj = asObject(v);
      const existing = obj ? obj[scopeColumn] : undefined;
      if (existing === undefined || existing === null || String(existing).trim().length === 0) {
        throw new Error(`[Supabase] Refusing Service Role write without ${scopeColumn} in payload (scope: ${scopeId})`);
      }
      if (String(existing) !== String(scopeId)) {
        throw new Error(`[Supabase] Refusing Service Role write with mismatched ${scopeColumn} (got ${existing}, expected ${scopeId})`);
      }
    }
  };

  return new Proxy(builder, {
    get(target, prop, receiver) {
      const original: unknown = Reflect.get(target, prop, receiver);

      if (typeof original !== 'function') return original;

      if (prop === 'select') {
        return (...args: unknown[]) => {
          const res = original.apply(target, args);
          const resObj = asObject(res);
          const eqFn = resObj?.eq;
          if (typeof eqFn === 'function') {
            return wrapReturn(eqFn(scopeColumn, scopeId));
          }
          return wrapReturn(res);
        };
      }

      if (prop === 'update') {
        return (...args: unknown[]) => {
          const res = original.apply(target, args);
          const resObj = asObject(res);
          const eqFn = resObj?.eq;
          if (typeof eqFn === 'function') {
            return wrapReturn(eqFn(scopeColumn, scopeId));
          }
          return wrapReturn(res);
        };
      }

      if (prop === 'delete') {
        return (...args: unknown[]) => {
          const res = original.apply(target, args);
          const resObj = asObject(res);
          const eqFn = resObj?.eq;
          if (typeof eqFn === 'function') {
            return wrapReturn(eqFn(scopeColumn, scopeId));
          }
          return wrapReturn(res);
        };
      }

      if (prop === 'insert' || prop === 'upsert') {
        return (payload: unknown, ...rest: unknown[]) => {
          ensureScopedWrite(payload);
          const res = original.apply(target, [payload, ...rest]);
          return wrapReturn(res);
        };
      }

      return (...args: unknown[]) => wrapReturn(original.apply(target, args));
    },
  });
}

export function getScopedSupabaseClient(organizationId: string): SupabaseClient {
  const scopeId = String(organizationId || '').trim();
  if (!scopeId) {
    throw new Error('[Supabase] Refusing to create scoped client without organizationId');
  }

  if (!ORG_UUID_REGEX.test(scopeId)) {
    throw new Error('[Supabase] Refusing to create scoped client with invalid organizationId');
  }

  const client = createClient();
  const originalFrom = client.from.bind(client);
  const originalRpc = typeof client.rpc === 'function' ? client.rpc.bind(client) : null;

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from' && typeof originalFrom === 'function') {
        return (table: string) => {
          const builder = originalFrom(table);
          const wrapped = wrapScopedBuilder({ builder, scopeColumn: 'organization_id', scopeId });
          const wrappedObj = asObject(wrapped);
          const eqFn = wrappedObj?.eq;
          if (typeof eqFn === 'function') {
            return eqFn('organization_id', scopeId);
          }
          return wrapped;
        };
      }

      if (prop === 'rpc' && typeof originalRpc === 'function') {
        return () => {
          throw new Error('[Supabase] Scoped client: rpc is blocked (Tenant Isolation)');
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient;
}

/**
 * @deprecated Prisma-First: אסור להשתמש ב-Service Role כדי לבצע גישה לנתונים עסקיים.
 * למידע נוסף: docs/ARCHITECTURE_DECISION.md
 */
export function createServiceRoleClientScoped(params: ServiceRoleClientScopedParams): SupabaseClient {
  const reason = params?.reason ? String(params.reason).trim() : '';
  const scopeId = params?.scopeId ? String(params.scopeId).trim() : '';
  const scopeColumn = params?.scopeColumn;

  if (!reason) {
    throw new Error('[Supabase] Refusing to create scoped Service Role client without a reason');
  }
  if (!scopeId) {
    throw new Error('[Supabase] Refusing to create scoped Service Role client without scopeId');
  }
  if (scopeColumn !== 'organization_id') {
    throw new Error('[Supabase] Refusing to create scoped Service Role client without a valid scopeColumn');
  }

  assertServiceRoleReasonAllowed({ reason, kind: 'scoped' });

  supabaseDebugWarn(
    '[Supabase] Creating SCOPED Service Role client (RLS bypassed):',
    reason,
    `(scope: ${scopeColumn}=${scopeId})`
  );

  void reportServiceRoleUsage({
    kind: 'scoped',
    reason,
    scopeColumn,
    scopeId,
  });

  const client = createRawServiceRoleClient();
  const ok = isAllowedSupabaseDbStack(new Error().stack);
  if (!ok) {
    return wrapServiceRoleStorageOnly(client, reason);
  }
  const clientObj = asObject(client) ?? {};
  const fromValue = clientObj.from;
  const originalFrom = typeof fromValue === 'function' ? (...args: unknown[]) => fromValue.apply(client, args) : null;
  if (typeof originalFrom !== 'function') return client;

  clientObj.from = (table: string) => {
    const builder = originalFrom(table) as unknown;
    const wrapped = wrapScopedBuilder({ builder, scopeColumn, scopeId });
    const wrappedObj = asObject(wrapped);
    const eqFn = wrappedObj?.eq;
    if (typeof eqFn === 'function') {
      return eqFn(scopeColumn, scopeId);
    }
    return wrapped;
  };

  const rpcValue = clientObj.rpc;
  const originalRpc = typeof rpcValue === 'function' ? (...args: unknown[]) => rpcValue.apply(client, args) : null;
  if (typeof originalRpc === 'function') {
    clientObj.rpc = () => {
      throw new Error('[Supabase] Service Role scoped client: rpc is blocked (Tenant Isolation)');
    };
  }

  return client;
}

// Helper function to create a new Supabase client (for server-side use)
// Security: This client MUST respect RLS. Do not use Service Role here.
/**
 * @deprecated Prisma-First: אסור להשתמש ב-createClient + supabase.from(...) כדי לקרוא/לכתוב נתונים עסקיים.
 * כל גישה לנתונים עסקיים חייבת להיות דרך Prisma עם ה-Guard המובנה.
 * Supabase (PostgREST) מותר רק עבור Storage/Realtime/Infra ובנתיבי E2E/תחזוקה ייעודיים.
 */
export function createClient(options?: CreateClientOptions): SupabaseClient {
  // Read environment variables fresh each time (important for Server Actions)
  // This ensures we always get the latest values, even if .env.local was updated
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    const error = new Error(IS_PROD ? 'Supabase is not configured' : 'Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL');
    supabaseErrorLog('[Supabase]', { message: error.message });
    throw error;
  }

  
  // Hardening (Tenant Isolation): default is ANON key.
  // Service Role bypasses RLS and is only allowed when explicitly requested.
  const useServiceRole = options?.useServiceRole === true;
  if (useServiceRole) {
    throw new Error(
      '[Supabase] Service Role is blocked via createClient({ useServiceRole: true }). ' +
        'Use createServiceRoleClient/createServiceRoleClientScoped with an allowlisted reason.'
    );
  }
  const key = useServiceRole ? serviceRoleKey : anonKey;

  if (!useServiceRole && key && serviceRoleKey && String(key).trim() === String(serviceRoleKey).trim()) {
    throw new Error(
      IS_PROD
        ? '[Supabase] Invalid configuration'
        : '[Supabase] Refusing to create regular client with Service Role key. ' +
          'NEXT_PUBLIC_SUPABASE_ANON_KEY must be the ANON key. Use createServiceRoleClient/createServiceRoleClientScoped for Service Role.'
    );
  }
  
  if (!key) {
    const error = new Error(
      IS_PROD
        ? 'Supabase is not configured'
        : useServiceRole
          ? 'Supabase SERVICE_ROLE key not configured. Please set SUPABASE_SERVICE_ROLE_KEY'
          : 'Supabase anon key not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    supabaseErrorLog('[Supabase]', { message: error.message });
    throw error;
  }
  
  // Log which key is being used (for debugging)
  if (useServiceRole) {
    supabaseDebugWarn('[Supabase] Using SERVICE ROLE key (RLS bypassed)');
  } else {
    supabaseDebugLog('[Supabase] Using ANON key (RLS enforced where configured)');
  }
  
  // Validate key format
  if (key.length < 20) {
    const error = new Error('Supabase key is too short. Expected at least 20 characters.');
    supabaseErrorLog('[Supabase]', { message: error.message });
    throw error;
  }
  
  try {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Invalid Supabase URL format');
    }
    
    // Create the client with minimal options first
    let client: SupabaseClient | null = null;
    try {
      // Try creating client with minimal config
      supabaseDebugLog('[Supabase] Attempting to create client with URL and key...');

      const fetchWithClerkJwt: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          const headers = new Headers(init?.headers);
          if (!headers.has('apikey')) {
            headers.set('apikey', key);
          }

          // NOTE: supabase-js sets Authorization=Bearer <anonKey> by default.
          // For RLS to work with Clerk, we must override that header with the Clerk Supabase JWT.
          const existingAuth = headers.get('Authorization');
          const shouldTryInjectClerk = !useServiceRole && (!existingAuth || existingAuth.trim() === `Bearer ${key}`);
          if (shouldTryInjectClerk) {
            const { auth } = await import('@clerk/nextjs/server');
            const authRes = await auth();
            const tokenFn =
              authRes &&
              typeof authRes === 'object' &&
              'getToken' in authRes &&
              typeof (authRes as { getToken?: unknown }).getToken === 'function'
                ? ((authRes as { getToken: (opts?: { template?: string }) => Promise<string | null> }).getToken)
                : null;
            if (tokenFn) {
              const template = process.env.CLERK_SUPABASE_JWT_TEMPLATE;
              const token = template ? await tokenFn({ template }) : await tokenFn();
              if (token && String(token).length > 0) {
                assertClerkSupabaseJwtHasOrganizationId(String(token), 'anon_client_fetch_with_clerk_jwt');
                headers.set('Authorization', `Bearer ${token}`);
              }
            }
          }
          return fetch(input, { ...init, headers });
        } catch {
          return fetch(input, init);
        }
      };

      client = createSupabaseClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: fetchWithClerkJwt,
        },
      });
      
      // Immediately verify the client structure
      if (!client) {
        throw new Error('createSupabaseClient returned null or undefined. Check your Supabase URL and key.');
      }
      
      supabaseDebugLog('[Supabase] Client created, type:', typeof client, 'has from:', typeof client?.from);
      
      // If that works, verify it has .from method
      if (!client || typeof client.from !== 'function') {
        supabaseDebugWarn('[Supabase] Client missing .from(), trying with auth options...');
        // Try with options
        client = createSupabaseClient(url, key, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            fetch: fetchWithClerkJwt,
          },
        });
        supabaseDebugLog('[Supabase] Client recreated with options, has from:', typeof client?.from);
        
        // Verify again after recreation
        if (!client || typeof client.from !== 'function') {
          throw new Error('Supabase client creation succeeded but result is invalid. This usually means the API key is incorrect or the server needs to be restarted after changing environment variables.');
        }
      }
    } catch (createError: unknown) {
      const createErrorMessage = getErrorMessage(createError);
      supabaseErrorLog(
        '[Supabase] createSupabaseClient threw error',
        IS_PROD ? undefined : { message: createErrorMessage, name: getErrorName(createError) },
        DEBUG_SUPABASE ? createError : undefined
      );
      
      // Check if this might be an environment variable issue
      if (createErrorMessage.includes('invalid') || createErrorMessage.includes('key')) {
        throw new Error(
          IS_PROD
            ? 'Failed to create Supabase client'
            : `Failed to create Supabase client: ${createErrorMessage}. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file, then restart the dev server.`
        );
      }
      
      throw new Error(IS_PROD ? 'Failed to create Supabase client' : `Failed to create Supabase client: ${createErrorMessage}`);
    }
    
    // Verify the client is valid using type guard
    const isValid = isValidSupabaseClient(client);
    supabaseDebugLog('[Supabase] Type guard validation result:', isValid);
    supabaseDebugLog('[Supabase] Client validation details:', {
      isNull: client === null,
      isUndefined: client === undefined,
      type: typeof client,
      isObject: typeof client === 'object',
      hasFrom: client && 'from' in client,
      fromType: client && typeof client.from,
      isFunction: client && typeof client.from === 'function',
      constructor: client && typeof client === 'object' ? (client as { constructor?: { name?: string } }).constructor?.name : undefined,
    });
    
    if (!isValid) {
      if (DEBUG_SUPABASE) {
        supabaseErrorLog('[Supabase] Invalid client structure', {
          isNull: client === null,
          isUndefined: client === undefined,
          type: typeof client,
          isObject: typeof client === 'object',
          hasFrom: client && 'from' in client,
          fromType: client && typeof client.from,
          constructor: client && typeof client === 'object' ? (client as { constructor?: { name?: string } }).constructor?.name : undefined,
          keys:
            client && typeof client === 'object'
              ? Object.keys(asObject(client) ?? {}).slice(0, 20)
              : 'N/A',
        });
      }
      
      // Provide helpful error message
      const errorMsg = IS_PROD
        ? 'Invalid Supabase client'
        : 'Invalid Supabase client: missing .from() method. This usually means:\n' +
          '1. The NEXT_PUBLIC_SUPABASE_ANON_KEY is incorrect or incomplete\n' +
          '2. The dev server needs to be restarted after changing .env.local\n' +
          '3. The Supabase package version might be incompatible\n' +
          '\nPlease check your environment variables and restart the dev server.';
      
      throw new Error(errorMsg);
    }
    
    supabaseDebugLog('[Supabase] Client validated successfully, has .from() method');

    const originalFrom = client.from.bind(client);
    const originalRpc = typeof client.rpc === 'function' ? client.rpc.bind(client) : null;
    const clientObj = asObject(client) ?? {};
    const schemaValue = clientObj.schema;
    const originalSchema = typeof schemaValue === 'function' ? (...args: unknown[]) => schemaValue.apply(client, args) : null;
    const originalRest = clientObj.rest;

    const guarded = new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === 'from' && typeof originalFrom === 'function') {
          return (table: string) => {
            if (SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENABLED) {
              const callerFile = extractCallerFileFromStack(new Error().stack, 'lib/supabase.ts');
              const ok = isAllowedSupabaseDbCaller(callerFile);
              if (!ok) {
                void reportBlockedDbAccess({ callerFile, kind: 'from', target: String(table || '') });
                const message =
                  '[Supabase] Prisma-First runtime guard: Direct PostgREST access is blocked. ' +
                  `Caller=${callerFile || 'unknown'} table=${String(table || '')}`;
                if (SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENFORCE) {
                  throw new Error(message);
                }
                supabaseSecurityWarn(message);
              }
            }
            return originalFrom(table);
          };
        }

        if (prop === 'rpc' && typeof originalRpc === 'function') {
          return (fn: string, ...args: unknown[]) => {
            if (SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENABLED) {
              const callerFile = extractCallerFileFromStack(new Error().stack, 'lib/supabase.ts');
              const ok = isAllowedSupabaseDbCaller(callerFile);
              if (!ok) {
                void reportBlockedDbAccess({ callerFile, kind: 'rpc', target: String(fn || '') });
                const message =
                  '[Supabase] Prisma-First runtime guard: Direct PostgREST rpc is blocked. ' +
                  `Caller=${callerFile || 'unknown'} rpc=${String(fn || '')}`;
                if (SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENFORCE) {
                  throw new Error(message);
                }
                supabaseSecurityWarn(message);
              }
            }
            return originalRpc(fn, ...args);
          };
        }

        if (prop === 'schema' && typeof originalSchema === 'function') {
          return (schema: string) => {
            if (SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENABLED) {
              const callerFile = extractCallerFileFromStack(new Error().stack, 'lib/supabase.ts');
              const ok = isAllowedSupabaseDbCaller(callerFile);
              if (!ok) {
                void reportBlockedDbAccess({ callerFile, kind: 'rpc', target: `schema:${String(schema || '')}` });
                const message =
                  '[Supabase] Prisma-First runtime guard: Direct PostgREST schema is blocked. ' +
                  `Caller=${callerFile || 'unknown'} schema=${String(schema || '')}`;
                if (SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENFORCE) {
                  throw new Error(message);
                }
                supabaseSecurityWarn(message);
              }
            }
            return originalSchema(schema);
          };
        }

        if (prop === 'rest' && originalRest) {
          if (SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENABLED) {
            const callerFile = extractCallerFileFromStack(new Error().stack, 'lib/supabase.ts');
            const ok = isAllowedSupabaseDbCaller(callerFile);
            if (!ok) {
              void reportBlockedDbAccess({ callerFile, kind: 'rpc', target: 'rest' });
              const message =
                '[Supabase] Prisma-First runtime guard: Direct PostgREST rest client is blocked. ' +
                `Caller=${callerFile || 'unknown'}`;
              if (SUPABASE_PRISMA_FIRST_RUNTIME_GUARD_ENFORCE) {
                throw new Error(message);
              }
              supabaseSecurityWarn(message);
            }
          }
          return originalRest;
        }

        return Reflect.get(target, prop, receiver);
      },
    });

    return guarded as SupabaseClient;
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    supabaseErrorLog('[Supabase] Error creating client');
    throw new Error(IS_PROD ? 'Failed to create Supabase client' : `Failed to create Supabase client: ${msg}`);
  }

}

export function createStorageClient(): SupabaseStorageClient {
  const client = createClient();
  return wrapStorageOnlyClient(client, 'createStorageClient');
}

export function createServiceRoleStorageClient(params: { reason: string; allowUnscoped: true }): SupabaseStorageClient {
  const client = createServiceRoleClient(params);
  return wrapStorageOnlyClient(client, `service_role:${String(params.reason)}`);
}

export function createStorageClientMaybe(): SupabaseStorageClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    return createStorageClient();
  } catch {
    return null;
  }
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}

// Helper to test Supabase connection
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.organization.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    supabaseErrorLog('[Supabase] Connection test failed', {
      message: getErrorMessage(error),
      name: getErrorName(error),
    }, DEBUG_SUPABASE ? error : undefined);
    return false;
  }
}

// Note: getCurrentUserId() was moved to @/lib/server/authHelper.ts
// to avoid 'server-only' import issues in client components

