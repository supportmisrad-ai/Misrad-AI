import { Prisma, PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { AsyncLocalStorage } from 'node:async_hooks';

const ORG_KEYS = new Set(['organizationId', 'organization_id']);
const TENANT_KEYS = new Set(['tenantId', 'tenant_id']);

declare global {
  var __MISRAD_PRISMA_TENANT_ISOLATION_OVERRIDE_COUNT__: number | undefined;
}

type TenantIsolationContext = {
  suppressReporting?: boolean;
  reason?: string;
  source?: string;
  organizationId?: string | null;
  tenantId?: string | null;
  mode?: 'default' | 'global_admin';
  isSuperAdmin?: boolean;
};

type TenantIsolationOverrideContext = TenantIsolationContext & {
  reason: string;
};

function incPrismaTenantIsolationOverrideCount(): number {
  const next = (globalThis.__MISRAD_PRISMA_TENANT_ISOLATION_OVERRIDE_COUNT__ ?? 0) + 1;
  globalThis.__MISRAD_PRISMA_TENANT_ISOLATION_OVERRIDE_COUNT__ = next;
  return next;
}

const tenantIsolationAls = new AsyncLocalStorage<TenantIsolationContext>();

const TENANT_ISOLATION_OVERRIDE = Symbol.for('misrad.prismaTenantIsolationOverride');

export function withPrismaTenantIsolationOverride<T extends Record<string, unknown>>(
  args: T,
  ctx: TenantIsolationOverrideContext
): T {
  const reason = String(ctx?.reason || '').trim();
  if (!reason) {
    throw new Error('[TenantIsolation] withPrismaTenantIsolationOverride blocked: missing reason');
  }

  const allowlistRaw = String(process.env.PRISMA_TENANT_ISOLATION_OVERRIDE_ALLOWED_REASONS || '').trim();
  if (process.env.NODE_ENV === 'production' && allowlistRaw) {
    const allowed = new Set(
      allowlistRaw
        .split(',')
        .map((x) => String(x || '').trim())
        .filter(Boolean)
    );
    if (!allowed.has(reason)) {
      throw new Error(`[TenantIsolation] withPrismaTenantIsolationOverride blocked: reason not allowlisted (${reason})`);
    }
  }

  const count = incPrismaTenantIsolationOverrideCount();
  const shouldReport = shouldReportTenantIsolation(ctx);

  try {
    const normalizeStackPath = (p: string): string =>
      String(p || '').replaceAll('\\', '/').replaceAll('\r', '').trim();

    const extractCallerFileFromStack = (stack: string | undefined): string | null => {
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
        if (file.endsWith('/lib/prisma-tenant-guard.ts')) continue;
        if (file.includes('/lib/prisma-tenant-guard.ts:')) continue;

        return file;
      }
      return null;
    };

    const stack = new Error().stack;
    const callerFile = extractCallerFileFromStack(stack);

    if (shouldReport && process.env.NODE_ENV !== 'production') {
      try {
        console.warn('[TenantIsolation][Override]', {
          count,
          reason,
          source: ctx?.source ?? null,
          callerFile,
          organizationId: ctx?.organizationId ?? null,
          tenantId: ctx?.tenantId ?? null,
          mode: ctx?.mode ?? null,
          isSuperAdmin: ctx?.isSuperAdmin ?? null,
        });
      } catch {
      }
    }

    if (shouldReport) {
      void import('./audit')
        .then((m) =>
          m.logAuditEvent('permission.check', 'prisma_tenant_isolation_override', {
            details: {
              count,
              reason,
              source: ctx?.source ?? null,
              callerFile,
              organizationId: ctx?.organizationId ?? null,
              tenantId: ctx?.tenantId ?? null,
              mode: ctx?.mode ?? null,
              isSuperAdmin: ctx?.isSuperAdmin ?? null,
            },
            success: true,
          })
        )
        .catch(() => null);

      Sentry.withScope((scope) => {
        scope.setTag('security_event', 'prisma_tenant_isolation_override');
        scope.setTag('tenant_isolation_override_reason', reason);
        const source = ctx?.source ?? tenantIsolationAls.getStore()?.source;
        if (source) scope.setTag('tenant_isolation_context', source);
        if (callerFile) scope.setTag('tenant_isolation_override_caller_file', callerFile);
        scope.setLevel('warning');
        scope.setExtra('tenant_isolation_override', {
          count,
          reason,
          source,
          callerFile,
          organizationId: ctx?.organizationId ?? null,
          tenantId: ctx?.tenantId ?? null,
          mode: ctx?.mode ?? null,
          isSuperAdmin: ctx?.isSuperAdmin ?? null,
          nodeEnv: process.env.NODE_ENV,
        });
        Sentry.captureMessage('Prisma tenant isolation override used', 'warning');
      });
    }
  } catch {
  }

  (args as Record<PropertyKey, unknown>)[TENANT_ISOLATION_OVERRIDE] = ctx;
  return args;
}

export async function withTenantIsolationContext<T>(
  ctx: TenantIsolationContext,
  fn: () => Promise<T>
): Promise<T> {
  const current = tenantIsolationAls.getStore() ?? {};
  return tenantIsolationAls.run({ ...current, ...ctx }, fn);
}

export function enterTenantIsolationContext(ctx: TenantIsolationContext): void {
  const current = tenantIsolationAls.getStore() ?? {};

  const currentOrg = normalizeScopeId(current.organizationId);
  const nextOrg = normalizeScopeId(ctx.organizationId);
  if (currentOrg) {
    if (ctx.organizationId === null || (typeof ctx.organizationId === 'string' && !ctx.organizationId.trim())) {
      throw new Error('[TenantIsolation] enterTenantIsolationContext blocked: attempted to clear organizationId');
    }
    if (nextOrg && nextOrg !== currentOrg) {
      throw new Error(
        `[TenantIsolation] enterTenantIsolationContext blocked: attempted to overwrite organizationId (${currentOrg} -> ${nextOrg})`
      );
    }
  }

  const currentTenant = normalizeScopeId(current.tenantId);
  const nextTenant = normalizeScopeId(ctx.tenantId);
  if (currentTenant) {
    if (ctx.tenantId === null || (typeof ctx.tenantId === 'string' && !ctx.tenantId.trim())) {
      throw new Error('[TenantIsolation] enterTenantIsolationContext blocked: attempted to clear tenantId');
    }
    if (nextTenant && nextTenant !== currentTenant) {
      throw new Error(
        `[TenantIsolation] enterTenantIsolationContext blocked: attempted to overwrite tenantId (${currentTenant} -> ${nextTenant})`
      );
    }
  }

  if (current.mode && ctx.mode && current.mode !== ctx.mode) {
    throw new Error(
      `[TenantIsolation] enterTenantIsolationContext blocked: attempted to overwrite mode (${String(current.mode)} -> ${String(ctx.mode)})`
    );
  }

  if (current.isSuperAdmin !== undefined && ctx.isSuperAdmin !== undefined && current.isSuperAdmin !== ctx.isSuperAdmin) {
    throw new Error(
      `[TenantIsolation] enterTenantIsolationContext blocked: attempted to overwrite isSuperAdmin (${String(current.isSuperAdmin)} -> ${String(ctx.isSuperAdmin)})`
    );
  }

  tenantIsolationAls.enterWith({ ...current, ...ctx });
}

function shouldReportTenantIsolation(override?: TenantIsolationContext): boolean {
  if (override?.suppressReporting === true) return false;
  return tenantIsolationAls.getStore()?.suppressReporting !== true;
}

function normalizeScopeId(value: unknown): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  return v ? v : null;
}

type ScopeRequirements = {
  requiresOrg: boolean;
  requiresTenant: boolean;
  orgField?: string;
  tenantField?: string;
};

const modelScopeRequirements = new Map<string, ScopeRequirements>(
  Prisma.dmmf.datamodel.models
    .map((m) => {
      const fieldNames = new Set(m.fields.map((f) => f.name));
      const requiresOrg = Array.from(ORG_KEYS).some((k) => fieldNames.has(k));
      const requiresTenant = Array.from(TENANT_KEYS).some((k) => fieldNames.has(k));
      const orgField = requiresOrg ? Array.from(ORG_KEYS).find((k) => fieldNames.has(k)) : undefined;
      const tenantField = requiresTenant ? Array.from(TENANT_KEYS).find((k) => fieldNames.has(k)) : undefined;
      return [m.name, { requiresOrg, requiresTenant, orgField, tenantField }] as const;
    })
    .filter(([, req]) => req.requiresOrg || req.requiresTenant)
);

function getExpectedScope(override?: TenantIsolationContext): { organizationId: string | null; tenantId: string | null } {
  const store = tenantIsolationAls.getStore();
  return {
    organizationId: normalizeScopeId(override?.organizationId ?? store?.organizationId),
    tenantId: normalizeScopeId(override?.tenantId ?? store?.tenantId),
  };
}

function isGlobalAdminContextAllowed(override?: TenantIsolationContext): boolean {
  const store = tenantIsolationAls.getStore();
  const mode = override?.mode ?? store?.mode;
  if (mode !== 'global_admin') return false;
  return (override?.isSuperAdmin ?? store?.isSuperAdmin) === true;
}

function captureTenantIsolation(params: {
  message: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  override?: TenantIsolationContext;
}): void {
  if (!shouldReportTenantIsolation(params.override)) return;
  try {
    const err = new Error(params.message);
    Sentry.withScope((scope) => {
      scope.setTag('TenantIsolation', 'true');
      const source = params.override?.source ?? tenantIsolationAls.getStore()?.source;
      if (source) scope.setTag('tenant_isolation_context', source);
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

function reportTenantIsolationBlocked(params: {
  message: string;
  model?: string;
  action?: string;
  reason?: string;
  override?: TenantIsolationContext;
}): void {
  captureTenantIsolation({
    message: params.message,
    tags: {
      tenant_isolation_source: 'prisma_guard',
      ...(params.model ? { prisma_model: params.model } : {}),
      ...(params.action ? { prisma_action: params.action } : {}),
    },
    extra: {
      ...(params.reason ? { reason: params.reason } : {}),
    },
    override: params.override,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}

const SOCIAL_SYSTEM_SETTINGS_GLOBAL_KEYS = new Set<string>([
  'feature_flags',
  'landing_settings',
  'module_icons',
  'system_email_settings',
  'global_branding',
  'maintenance_settings',
  'global_download_links',
  'products_catalog_v1',
]);

const SOCIAL_SYSTEM_SETTINGS_ORG_KEY_PREFIXES = ['nexus_onboarding_template:', 'nexus_billing_items:'];

function extractScalarEquals(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const obj = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(obj, 'equals')) return obj.equals;
  return value;
}

function getDirectWhereFieldValue(where: unknown, field: string): unknown {
  if (!where || typeof where !== 'object' || Array.isArray(where)) return undefined;
  const obj = where as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(obj, field)) return undefined;
  return extractScalarEquals(obj[field]);
}

function isWriteAction(action: string): boolean {
  return new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']).has(
    action
  );
}

function extractKeyValueFromArgs(action: string, args: Record<string, unknown>, field: string): unknown {
  const where = args.where;
  const data = args.data;
  const create = args.create;
  const update = args.update;

  const fromWhere = getDirectWhereFieldValue(where, field);
  if (fromWhere !== undefined) return fromWhere;

  if (action === 'create' || action === 'createMany' || action === 'createManyAndReturn' || action === 'update' || action === 'updateMany') {
    const fromData = getDirectWhereFieldValue(data, field);
    if (fromData !== undefined) return fromData;
  }

  if (action === 'upsert') {
    const fromCreate = getDirectWhereFieldValue(create, field);
    if (fromCreate !== undefined) return fromCreate;
    const fromUpdate = getDirectWhereFieldValue(update, field);
    if (fromUpdate !== undefined) return fromUpdate;
  }

  return undefined;
}

function enforceSocialSystemSettingsAccess(params: {
  action: string;
  args: Record<string, unknown>;
  expectedOrganizationId: string | null;
  isGlobalAdmin: boolean;
  override?: TenantIsolationContext;
}): void {
  const action = params.action;
  const keyRaw = extractKeyValueFromArgs(action, params.args, 'key');
  const key = typeof keyRaw === 'string' ? keyRaw.trim() : '';

  if (!key) {
    const message = `[TenantIsolation] social_system_settings blocked: missing key. (social_system_settings.${action})`;
    reportTenantIsolationBlocked({ message, model: 'social_system_settings', action, reason: 'missing_key', override: params.override });
    throw new Error(message);
  }

  const isOrgKey = SOCIAL_SYSTEM_SETTINGS_ORG_KEY_PREFIXES.some((p) => key.startsWith(p));
  const isGlobalKey = SOCIAL_SYSTEM_SETTINGS_GLOBAL_KEYS.has(key);

  if (isOrgKey) {
    const expected = params.expectedOrganizationId;
    if (!expected) {
      const message = `[TenantIsolation] social_system_settings blocked: missing organization context. (social_system_settings.${action})`;
      reportTenantIsolationBlocked({
        message,
        model: 'social_system_settings',
        action,
        reason: 'missing_organization_context',
        override: params.override,
      });
      throw new Error(message);
    }

    if (!key.endsWith(`:${expected}`)) {
      const message = `[TenantIsolation] social_system_settings blocked: key scope mismatch. (social_system_settings.${action})`;
      reportTenantIsolationBlocked({
        message,
        model: 'social_system_settings',
        action,
        reason: 'key_scope_mismatch',
        override: params.override,
      });
      throw new Error(message);
    }
  } else if (!isGlobalKey && !params.isGlobalAdmin) {
    const message = `[TenantIsolation] social_system_settings blocked: key not allowlisted. (social_system_settings.${action})`;
    reportTenantIsolationBlocked({
      message,
      model: 'social_system_settings',
      action,
      reason: 'key_not_allowlisted',
      override: params.override,
    });
    throw new Error(message);
  }

  if (isWriteAction(action)) {
    if (!isOrgKey && !params.isGlobalAdmin) {
      const message = `[TenantIsolation] social_system_settings blocked: global write requires global_admin. (social_system_settings.${action})`;
      reportTenantIsolationBlocked({
        message,
        model: 'social_system_settings',
        action,
        reason: 'global_write_requires_global_admin',
        override: params.override,
      });
      throw new Error(message);
    }
  }
}

function enforceCoreSystemSettingsAccess(params: {
  action: string;
  args: Record<string, unknown>;
  expectedOrganizationId: string | null;
  isGlobalAdmin: boolean;
  override?: TenantIsolationContext;
}): void {
  const action = params.action;
  const keyRaw = extractKeyValueFromArgs(action, params.args, 'key');
  const key = typeof keyRaw === 'string' ? keyRaw.trim() : '';

  if (!key) {
    const message = `[TenantIsolation] core_system_settings blocked: missing key. (CoreSystemSettings.${action})`;
    reportTenantIsolationBlocked({ message, model: 'CoreSystemSettings', action, reason: 'missing_key', override: params.override });
    throw new Error(message);
  }

  const isOrgKey = SOCIAL_SYSTEM_SETTINGS_ORG_KEY_PREFIXES.some((p) => key.startsWith(p));
  const isGlobalKey = SOCIAL_SYSTEM_SETTINGS_GLOBAL_KEYS.has(key);

  if (isOrgKey) {
    const expected = params.expectedOrganizationId;
    if (!expected) {
      const message = `[TenantIsolation] core_system_settings blocked: missing organization context. (CoreSystemSettings.${action})`;
      reportTenantIsolationBlocked({
        message,
        model: 'CoreSystemSettings',
        action,
        reason: 'missing_organization_context',
        override: params.override,
      });
      throw new Error(message);
    }

    if (!key.endsWith(`:${expected}`)) {
      const message = `[TenantIsolation] core_system_settings blocked: key scope mismatch. (CoreSystemSettings.${action})`;
      reportTenantIsolationBlocked({
        message,
        model: 'CoreSystemSettings',
        action,
        reason: 'key_scope_mismatch',
        override: params.override,
      });
      throw new Error(message);
    }
  } else if (!isGlobalKey && !params.isGlobalAdmin) {
    const message = `[TenantIsolation] core_system_settings blocked: key not allowlisted. (CoreSystemSettings.${action})`;
    reportTenantIsolationBlocked({
      message,
      model: 'CoreSystemSettings',
      action,
      reason: 'key_not_allowlisted',
      override: params.override,
    });
    throw new Error(message);
  }

  if (isWriteAction(action)) {
    if (!isOrgKey && !params.isGlobalAdmin) {
      const message = `[TenantIsolation] core_system_settings blocked: global write requires global_admin. (CoreSystemSettings.${action})`;
      reportTenantIsolationBlocked({
        message,
        model: 'CoreSystemSettings',
        action,
        reason: 'global_write_requires_global_admin',
        override: params.override,
      });
      throw new Error(message);
    }
  }
}

function enforceGlobalSettingsAccess(params: {
  action: string;
  args: Record<string, unknown>;
  isGlobalAdmin: boolean;
  override?: TenantIsolationContext;
}): void {
  const action = params.action;
  const idRaw = extractKeyValueFromArgs(action, params.args, 'id');
  const id = typeof idRaw === 'string' ? idRaw.trim() : '';

  if (!id) {
    const message = `[TenantIsolation] global_settings blocked: missing id. (global_settings.${action})`;
    reportTenantIsolationBlocked({ message, model: 'global_settings', action, reason: 'missing_id', override: params.override });
    throw new Error(message);
  }

  if (id !== 'global') {
    const message = `[TenantIsolation] global_settings blocked: id not allowlisted. (global_settings.${action})`;
    reportTenantIsolationBlocked({ message, model: 'global_settings', action, reason: 'id_not_allowlisted', override: params.override });
    throw new Error(message);
  }

  if (isWriteAction(action) && !params.isGlobalAdmin) {
    const message = `[TenantIsolation] global_settings blocked: write requires global_admin. (global_settings.${action})`;
    reportTenantIsolationBlocked({
      message,
      model: 'global_settings',
      action,
      reason: 'write_requires_global_admin',
      override: params.override,
    });
    throw new Error(message);
  }
}

function enforceSystemSettingsAccess(params: {
  action: string;
  args: Record<string, unknown>;
  expectedOrganizationId: string | null;
  isGlobalAdmin: boolean;
  override?: TenantIsolationContext;
}): void {
  const action = params.action;
  const tenantRaw = extractKeyValueFromArgs(action, params.args, 'tenant_id');

  if (tenantRaw === undefined) {
    // Allow read-only operations without tenant_id (system_settings is a global-readable table)
    const readOnlyActions = new Set(['findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy']);
    if (readOnlyActions.has(action)) {
      return;
    }

    if (params.isGlobalAdmin) {
      const idRaw = extractKeyValueFromArgs(action, params.args, 'id');
      const id = typeof idRaw === 'string' ? idRaw.trim() : '';
      const idOnlyAllowedActions = new Set(['update', 'delete']);
      if (id && idOnlyAllowedActions.has(action)) {
        return;
      }
    }

    const message = `[TenantIsolation] system_settings blocked: missing tenant_id. (system_settings.${action})`;
    reportTenantIsolationBlocked({ message, model: 'system_settings', action, reason: 'missing_tenant_id', override: params.override });
    throw new Error(message);
  }

  const tenantId = tenantRaw == null ? null : normalizeScopeId(tenantRaw);
  const expectedOrg = params.expectedOrganizationId;

  if (tenantId === null) {
    if (isWriteAction(action) && !params.isGlobalAdmin) {
      const message = `[TenantIsolation] system_settings blocked: global write requires global_admin. (system_settings.${action})`;
      reportTenantIsolationBlocked({
        message,
        model: 'system_settings',
        action,
        reason: 'global_write_requires_global_admin',
        override: params.override,
      });
      throw new Error(message);
    }

    return;
  }

  if (params.isGlobalAdmin) {
    return;
  }

  if (!expectedOrg) {
    const message = `[TenantIsolation] system_settings blocked: tenant access requires context or global_admin. (system_settings.${action})`;
    reportTenantIsolationBlocked({
      message,
      model: 'system_settings',
      action,
      reason: 'tenant_access_requires_context',
      override: params.override,
    });
    throw new Error(message);
  }

  if (tenantId !== expectedOrg) {
    const message = `[TenantIsolation] system_settings blocked: tenant_id scope mismatch. (system_settings.${action})`;
    reportTenantIsolationBlocked({
      message,
      model: 'system_settings',
      action,
      reason: 'tenant_id_scope_mismatch',
      override: params.override,
    });
    throw new Error(message);
  }
}

function valueMatchesScope(expected: string, v: unknown): boolean {
  if (typeof v === 'string') return v.trim() === expected;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;

  const obj = v as Record<string, unknown>;
  const equals = obj.equals;
  if (typeof equals === 'string') return equals.trim() === expected;

  const inVal = obj.in;
  if (Array.isArray(inVal)) {
    const normalized = inVal.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
    return normalized.length === 1 && normalized[0] === expected;
  }

  return false;
}

function whereMatchesScope(where: unknown, keys: Set<string>, expected: string): boolean {
  if (!where) return false;
  if (Array.isArray(where)) return where.every((v) => whereMatchesScope(v, keys, expected));
  if (!isPlainObject(where)) return true;

  for (const [k, v] of Object.entries(where)) {
    if (keys.has(k)) {
      if (v == null) return false;
      if (!valueMatchesScope(expected, v)) return false;
      continue;
    }
    if (!whereMatchesScope(v, keys, expected)) return false;
  }

  return true;
}

function applyScopeToCreateData(params: {
  action: string;
  data: unknown;
  field: string;
  expected: string;
}): unknown {
  const { action, data, field, expected } = params;

  if (action === 'createMany' || action === 'createManyAndReturn') {
    if (!Array.isArray(data)) return data;
    return data.map((row) => applyScopeToCreateData({ action: 'create', data: row, field, expected }));
  }

  if (!isPlainObject(data)) return data;

  if (Object.prototype.hasOwnProperty.call(data, field)) {
    const current = (data as Record<string, unknown>)[field];
    if (current != null && !valueMatchesScope(expected, current)) {
      return TENANT_ISOLATION_OVERRIDE;
    }
    return { ...(data as Record<string, unknown>), [field]: expected };
  }

  return { ...(data as Record<string, unknown>), [field]: expected };
}

function hasFilterForKeys(value: unknown, keys: Set<string>): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((v) => hasFilterForKeys(v, keys));

  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (keys.has(k)) {
      if (v == null) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      return true;
    }

    if (hasFilterForKeys(v, keys)) return true;
  }

  return false;
}

 function hasScopedDataForCreateAction(action: string, data: unknown, keys: Set<string>): boolean {
   // For createMany we must ensure EVERY record includes organization/tenant scope.
   // hasFilterForKeys() treats arrays as `some(...)`, which is correct for nested payloads
   // but unsafe for createMany.
   if (action === 'createMany' || action === 'createManyAndReturn') {
     if (Array.isArray(data)) {
       return data.every((row) => hasFilterForKeys(row, keys));
     }
   }
   return hasFilterForKeys(data, keys);
 }

function hasDirectScopedKey(where: Record<string, unknown>, keys: Set<string>): boolean {
  for (const k of Object.keys(where)) {
    if (!keys.has(k)) continue;
    const v = where[k];
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    return true;
  }
  return false;
}

function ensureTenantScopeIsGuaranteed(where: unknown, keys: Set<string>): boolean {
  if (!where) return false;
  if (Array.isArray(where)) {
    return where.some((v) => ensureTenantScopeIsGuaranteed(v, keys));
  }
  if (!isPlainObject(where)) return false;

  const obj = where;
  if (hasDirectScopedKey(obj, keys)) return true;

  const andVal = obj.AND;
  if (andVal) {
    if (Array.isArray(andVal)) {
      if (andVal.some((v) => ensureTenantScopeIsGuaranteed(v, keys))) return true;
    } else {
      if (ensureTenantScopeIsGuaranteed(andVal, keys)) return true;
    }
  }

  const orVal = obj.OR;
  if (orVal) {
    const branches = Array.isArray(orVal) ? orVal : [orVal];
    return branches.length > 0 && branches.every((b) => ensureTenantScopeIsGuaranteed(b, keys));
  }

  for (const [k, v] of Object.entries(obj)) {
    if (k === 'AND' || k === 'OR' || k === 'NOT') continue;
    if (keys.has(k)) continue;
    if (ensureTenantScopeIsGuaranteed(v, keys)) return true;
  }

  return false;
}

function validateNoUnscopedOr(where: unknown, keys: Set<string>, hasGlobalScope: boolean): boolean {
  if (!where) return true;
  if (Array.isArray(where)) return where.every((v) => validateNoUnscopedOr(v, keys, hasGlobalScope));
  if (!isPlainObject(where)) return true;

  const obj = where;

  const andVal = obj.AND;
  const scopeFromAnd = andVal
    ? Array.isArray(andVal)
      ? andVal.some((v) => ensureTenantScopeIsGuaranteed(v, keys))
      : ensureTenantScopeIsGuaranteed(andVal, keys)
    : false;

  const globalScopeHere = hasGlobalScope || hasDirectScopedKey(obj, keys) || scopeFromAnd;

  const orVal = obj.OR;
  if (orVal && !globalScopeHere) {
    const branches = Array.isArray(orVal) ? orVal : [orVal];
    if (branches.some((b) => !ensureTenantScopeIsGuaranteed(b, keys))) {
      return false;
    }
  }

  if (andVal) {
    const andNodes = Array.isArray(andVal) ? andVal : [andVal];
    if (!andNodes.every((n) => validateNoUnscopedOr(n, keys, globalScopeHere))) return false;
  }

  if (orVal) {
    const orNodes = Array.isArray(orVal) ? orVal : [orVal];
    if (!orNodes.every((n) => validateNoUnscopedOr(n, keys, globalScopeHere))) return false;
  }

  const notVal = obj.NOT;
  if (notVal) {
    const notNodes = Array.isArray(notVal) ? notVal : [notVal];
    if (!notNodes.every((n) => validateNoUnscopedOr(n, keys, globalScopeHere))) return false;
  }

  for (const [k, v] of Object.entries(obj)) {
    if (k === 'AND' || k === 'OR' || k === 'NOT') continue;
    if (!validateNoUnscopedOr(v, keys, globalScopeHere)) return false;
  }

  return true;
}

function isEmployeeInvitationLookupByTokenUnscopedAllowed(params: {
  model: string;
  action: string;
  args: Record<string, unknown>;
}): boolean {
  const modelLower = String(params.model || '').toLowerCase();
  if (modelLower !== 'nexus_employee_invitation_links') return false;

  const allowedActions = new Set(['findUnique', 'findFirst']);
  if (!allowedActions.has(params.action)) return false;

  const where = params.args?.where;
  if (!where || typeof where !== 'object') return false;
  if (hasDirectKey(where, 'OR')) return false;
  if (!hasDirectKey(where, 'token')) return false;
  if (isPlainObject(where)) {
    const keys = Object.keys(where);
    if (keys.length !== 1 || keys[0] !== 'token') return false;
  }

  return true;
}

function isWhereScoped(where: unknown, keys: Set<string>): boolean {
  if (!ensureTenantScopeIsGuaranteed(where, keys)) return false;
  return validateNoUnscopedOr(where, keys, false);
}

function hasDirectKey(where: unknown, key: string): boolean {
  if (!where || typeof where !== 'object') return false;
  if (Array.isArray(where)) return where.some((v) => hasDirectKey(v, key));
  return Object.prototype.hasOwnProperty.call(where as Record<string, unknown>, key);
}

function isProfileLookupByClerkUserIdUnscopedAllowed(params: {
  model: string;
  action: string;
  where: unknown;
}): boolean {
  const modelLower = String(params.model || '').toLowerCase();
  if (modelLower !== 'profile') return false;
  if (!params.where || typeof params.where !== 'object') return false;
  const allowedActions = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow']);
  if (!allowedActions.has(params.action)) return false;

  // Only allow direct lookup by clerkUserId without OR branches.
  // Profile has @@unique([organizationId, clerkUserId]) so this is not a cross-tenant list.
  // This exception exists to enable bootstrap and resolve organizationId from the logged-in user's clerkUserId.
  if (hasDirectKey(params.where, 'OR')) return false;
  return hasDirectKey(params.where, 'clerkUserId');
}

function isSocialUserLookupByClerkUserIdUnscopedAllowed(params: {
  model: string;
  action: string;
  where: unknown;
}): boolean {
  const modelLower = String(params.model || '').toLowerCase();
  if (modelLower !== 'organizationuser' && modelLower !== 'organization_users' && modelLower !== 'socialusers') return false;
  if (!params.where || typeof params.where !== 'object') return false;
  const allowedActions = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'update', 'updateMany']);
  if (!allowedActions.has(params.action)) return false;
  if (hasDirectKey(params.where, 'OR')) return false;
  if (!isPlainObject(params.where)) return false;
  const keys = Object.keys(params.where);
  if (keys.length !== 1) return false;
  const k = keys[0];
  if (k !== 'clerk_user_id' && k !== 'clerkUserId') return false;
  const v = params.where[k];
  if (typeof v === 'string') return v.trim().length > 0;
  if (!isPlainObject(v)) return false;
  const vKeys = Object.keys(v);
  if (vKeys.length !== 1 || vKeys[0] !== 'equals') return false;
  const equals = v.equals;
  return typeof equals === 'string' && equals.trim().length > 0;
}

function isSocialTeamMembersLookupByUserIdUnscopedAllowed(params: {
  model: string;
  action: string;
  where: unknown;
}): boolean {
  const modelLower = String(params.model || '').toLowerCase();
  if (modelLower !== 'teammember' && modelLower !== 'team_members' && modelLower !== 'socialteammembers') return false;
  if (!params.where || typeof params.where !== 'object') return false;

  const allowedActions = new Set(['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy']);
  if (!allowedActions.has(params.action)) return false;

  // Only allow direct lookup by user_id without OR branches.
  // This supports resolving a user's org memberships during bootstrap.
  if (hasDirectKey(params.where, 'OR')) return false;
  return hasDirectKey(params.where, 'user_id') || hasDirectKey(params.where, 'userId');
}

function isOrganizationUserBootstrapCreateAllowed(params: {
  model: string;
  action: string;
  args: Record<string, unknown>;
  override?: TenantIsolationOverrideContext;
  expectedOrganizationId: string | null;
}): boolean {
  if (params.expectedOrganizationId) return false;
  if (params.action !== 'create') return false;

  const modelLower = String(params.model || '').toLowerCase();
  if (modelLower !== 'organizationuser') return false;

  const reason = String(params.override?.reason || '').trim();
  if (reason !== 'bootstrap_workspace_provision') return false;

  const data = params.args.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;

  const clerkUserIdRaw = obj.clerk_user_id ?? obj.clerkUserId;
  const clerkUserId = typeof clerkUserIdRaw === 'string' ? clerkUserIdRaw.trim() : '';
  if (!clerkUserId) return false;

  const orgVal = Object.prototype.hasOwnProperty.call(obj, 'organization_id')
    ? obj.organization_id
    : Object.prototype.hasOwnProperty.call(obj, 'organizationId')
      ? obj.organizationId
      : undefined;

  return orgVal === null;
}

function isNexusUserLookupByEmailUnscopedAllowed(params: {
  model: string;
  action: string;
  args: Record<string, unknown>;
}): boolean {
  const modelLower = String(params.model || '').toLowerCase();
  if (modelLower !== 'nexususer') return false;

  const allowedActions = new Set(['findMany', 'findFirst']);
  if (!allowedActions.has(params.action)) return false;

  const where = params.args?.where;
  if (!where || typeof where !== 'object') return false;
  if (hasDirectKey(where, 'OR')) return false;

  // Narrow allowlist: exact lookup by email only, for bootstrap flows.
  if (!hasDirectKey(where, 'email')) return false;

  const takeRaw = params.args?.take;
  if (takeRaw !== undefined) {
    const take = Number(takeRaw);
    if (!Number.isFinite(take) || take > 2) return false;
  }

  return true;
}

export function installPrismaTenantGuard(
  prisma: PrismaClient,
  options?: {
    excludedModels?: string[];
  }
): void {
  const excludedModels = new Set<string>([
    'system_settings',
    'core_system_settings',
    'social_system_settings',
    'global_settings',
    ...(options?.excludedModels ?? []),
  ]);

  prisma.$use(async (params, next) => {
    const model = params.model;
    if (!model) {
      return next(params);
    }

    const args = (params.args ?? {}) as Record<string, unknown>;
    const override = (args as Record<PropertyKey, unknown>)[TENANT_ISOLATION_OVERRIDE] as TenantIsolationOverrideContext | undefined;
    const expected = getExpectedScope(override);
    const isGlobalAdmin = isGlobalAdminContextAllowed(override);

    const modelLower = String(model).toLowerCase();
    if (modelLower === 'social_system_settings') {
      enforceSocialSystemSettingsAccess({
        action: params.action,
        args,
        expectedOrganizationId: expected.organizationId,
        isGlobalAdmin,
        override,
      });
      return next(params);
    }
    if (modelLower === 'coresystemsettings') {
      enforceCoreSystemSettingsAccess({
        action: params.action,
        args,
        expectedOrganizationId: expected.organizationId,
        isGlobalAdmin,
        override,
      });
      return next(params);
    }
    if (modelLower === 'global_settings') {
      enforceGlobalSettingsAccess({ action: params.action, args, isGlobalAdmin, override });
      return next(params);
    }
    if (modelLower === 'system_settings') {
      enforceSystemSettingsAccess({
        action: params.action,
        args,
        expectedOrganizationId: expected.organizationId,
        isGlobalAdmin,
        override,
      });
      return next(params);
    }

    if (excludedModels.has(model)) {
      return next(params);
    }

    const req = modelScopeRequirements.get(model);
    if (!req) {
      return next(params);
    }

    const where = (args as { where?: unknown }).where;
    const action = params.action;

    const actionsRequiringWhere = new Set([
      'findUnique',
      'findUniqueOrThrow',
      'findFirst',
      'findFirstOrThrow',
      'findMany',
      'count',
      'aggregate',
      'groupBy',
      'update',
      'updateMany',
      'delete',
      'deleteMany',
      'upsert',
    ]);

    if (actionsRequiringWhere.has(action)) {
      if (!isGlobalAdmin && req.requiresOrg && !isWhereScoped(where, ORG_KEYS)) {
        if (!expected.organizationId) {
          if (isProfileLookupByClerkUserIdUnscopedAllowed({ model, action, where })) {
            return next(params);
          }
          if (isSocialUserLookupByClerkUserIdUnscopedAllowed({ model, action, where })) {
            return next(params);
          }
          if (isSocialTeamMembersLookupByUserIdUnscopedAllowed({ model, action, where })) {
            return next(params);
          }
          if (isNexusUserLookupByEmailUnscopedAllowed({ model, action, args })) {
            return next(params);
          }
          if (isEmployeeInvitationLookupByTokenUnscopedAllowed({ model, action, args })) {
            return next(params);
          }
        }
        if (process.env.NODE_ENV !== 'production' && String(model) === 'OrganizationUser') {
          try {
            console.error('[tenant-guard] missing organization scope for social_users', {
              action,
              whereType: typeof where,
              whereKeys: isPlainObject(where) ? Object.keys(where) : null,
              hasClerkUserIdKey: hasDirectKey(where, 'clerk_user_id') || hasDirectKey(where, 'clerkUserId'),
            });
          } catch {
            // ignore
          }
        }
        const message = `Tenant Guard Violation! Missing Organization ID. (${model}.${action})`;
        reportTenantIsolationBlocked({ message, model, action, reason: 'missing_organizationId_where', override });
        throw new Error(message);
      }
      if (!isGlobalAdmin && req.requiresOrg && expected.organizationId && !whereMatchesScope(where, ORG_KEYS, expected.organizationId)) {
        const message = `Tenant Guard Violation! Organization scope mismatch. (${model}.${action})`;
        reportTenantIsolationBlocked({ message, model, action, reason: 'organizationId_mismatch_where', override });
        throw new Error(message);
      }
      if (req.requiresTenant && !isWhereScoped(where, TENANT_KEYS)) {
        const message = `Tenant Guard Violation! Missing Tenant ID. (${model}.${action})`;
        reportTenantIsolationBlocked({ message, model, action, reason: 'missing_tenantId_where', override });
        throw new Error(message);
      }
      if (req.requiresTenant && expected.tenantId && !whereMatchesScope(where, TENANT_KEYS, expected.tenantId)) {
        const message = `Tenant Guard Violation! Tenant scope mismatch. (${model}.${action})`;
        reportTenantIsolationBlocked({ message, model, action, reason: 'tenantId_mismatch_where', override });
        throw new Error(message);
      }
    }

    const actionsRequiringData = new Set(['create', 'createMany', 'createManyAndReturn', 'upsert']);
    if (actionsRequiringData.has(action)) {
      if (action === 'upsert') {
        if (req.requiresOrg && expected.organizationId && req.orgField) {
          const nextCreate = applyScopeToCreateData({ action: 'create', data: args.create, field: req.orgField, expected: expected.organizationId });
          const nextUpdate = applyScopeToCreateData({ action: 'create', data: args.update, field: req.orgField, expected: expected.organizationId });
          if (nextCreate === TENANT_ISOLATION_OVERRIDE || nextUpdate === TENANT_ISOLATION_OVERRIDE) {
            const message = `Tenant Guard Violation! Organization scope mismatch. (${model}.${action})`;
            reportTenantIsolationBlocked({ message, model, action, reason: 'organizationId_mismatch_upsert_payload', override });
            throw new Error(message);
          }
          args.create = nextCreate;
          args.update = nextUpdate;
        }

        if (req.requiresTenant && expected.tenantId && req.tenantField) {
          const nextCreate = applyScopeToCreateData({ action: 'create', data: args.create, field: req.tenantField, expected: expected.tenantId });
          const nextUpdate = applyScopeToCreateData({ action: 'create', data: args.update, field: req.tenantField, expected: expected.tenantId });
          if (nextCreate === TENANT_ISOLATION_OVERRIDE || nextUpdate === TENANT_ISOLATION_OVERRIDE) {
            const message = `Tenant Guard Violation! Tenant scope mismatch. (${model}.${action})`;
            reportTenantIsolationBlocked({ message, model, action, reason: 'tenantId_mismatch_upsert_payload', override });
            throw new Error(message);
          }
          args.create = nextCreate;
          args.update = nextUpdate;
        }

        if (req.requiresOrg && (!hasFilterForKeys(args.create, ORG_KEYS) || !hasFilterForKeys(args.update, ORG_KEYS))) {
          const message = `Tenant Guard Violation! Missing Organization ID. (${model}.${action})`;
          reportTenantIsolationBlocked({ message, model, action, reason: 'missing_organizationId_upsert_payload', override });
          throw new Error(message);
        }
        if (req.requiresTenant && (!hasFilterForKeys(args.create, TENANT_KEYS) || !hasFilterForKeys(args.update, TENANT_KEYS))) {
          const message = `Tenant Guard Violation! Missing Tenant ID. (${model}.${action})`;
          reportTenantIsolationBlocked({ message, model, action, reason: 'missing_tenantId_upsert_payload', override });
          throw new Error(message);
        }
      } else {
        let data = args.data;

        if (req.requiresOrg && expected.organizationId && req.orgField) {
          const nextData = applyScopeToCreateData({ action, data, field: req.orgField, expected: expected.organizationId });
          if (nextData === TENANT_ISOLATION_OVERRIDE) {
            const message = `Tenant Guard Violation! Organization scope mismatch. (${model}.${action})`;
            reportTenantIsolationBlocked({ message, model, action, reason: 'organizationId_mismatch_data', override });
            throw new Error(message);
          }
          data = nextData;
          args.data = data;
        }

        if (req.requiresTenant && expected.tenantId && req.tenantField) {
          const nextData = applyScopeToCreateData({ action, data, field: req.tenantField, expected: expected.tenantId });
          if (nextData === TENANT_ISOLATION_OVERRIDE) {
            const message = `Tenant Guard Violation! Tenant scope mismatch. (${model}.${action})`;
            reportTenantIsolationBlocked({ message, model, action, reason: 'tenantId_mismatch_data', override });
            throw new Error(message);
          }
          data = nextData;
          args.data = data;
        }

        if (req.requiresOrg && !hasScopedDataForCreateAction(action, data, ORG_KEYS)) {
          if (
            isOrganizationUserBootstrapCreateAllowed({
              model,
              action,
              args,
              override,
              expectedOrganizationId: expected.organizationId,
            })
          ) {
            return next(params);
          }
          const message = `Tenant Guard Violation! Missing Organization ID. (${model}.${action})`;
          reportTenantIsolationBlocked({ message, model, action, reason: 'missing_organizationId_data', override });
          throw new Error(message);
        }
        if (req.requiresTenant && !hasScopedDataForCreateAction(action, data, TENANT_KEYS)) {
          const message = `Tenant Guard Violation! Missing Tenant ID. (${model}.${action})`;
          reportTenantIsolationBlocked({ message, model, action, reason: 'missing_tenantId_data', override });
          throw new Error(message);
        }
      }
    }

    return next(params);
  });
}
