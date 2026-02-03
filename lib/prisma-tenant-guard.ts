import { Prisma, PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { AsyncLocalStorage } from 'node:async_hooks';

const ORG_KEYS = new Set(['organizationId', 'organization_id']);
const TENANT_KEYS = new Set(['tenantId', 'tenant_id']);

type TenantIsolationContext = {
  suppressReporting?: boolean;
  source?: string;
  organizationId?: string | null;
  tenantId?: string | null;
};

const tenantIsolationAls = new AsyncLocalStorage<TenantIsolationContext>();

const TENANT_ISOLATION_OVERRIDE = Symbol.for('misrad.prismaTenantIsolationOverride');

export function withPrismaTenantIsolationOverride<T extends Record<string, unknown>>(
  args: T,
  ctx: TenantIsolationContext
): T {
  (args as unknown as Record<PropertyKey, unknown>)[TENANT_ISOLATION_OVERRIDE] = ctx;
  return args;
}

export async function withTenantIsolationContext<T>(
  ctx: TenantIsolationContext,
  fn: () => Promise<T>
): Promise<T> {
  const current = tenantIsolationAls.getStore() ?? {};
  return tenantIsolationAls.run({ ...current, ...ctx }, fn);
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
  if (modelLower !== 'social_users' && modelLower !== 'socialusers') return false;
  if (!params.where || typeof params.where !== 'object') return false;
  const allowedActions = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'update']);
  if (!allowedActions.has(params.action)) return false;
  if (hasDirectKey(params.where, 'OR')) return false;
  return hasDirectKey(params.where, 'clerk_user_id') || hasDirectKey(params.where, 'clerkUserId');
}

function isSocialTeamMembersLookupByUserIdUnscopedAllowed(params: {
  model: string;
  action: string;
  where: unknown;
}): boolean {
  const modelLower = String(params.model || '').toLowerCase();
  if (modelLower !== 'social_team_members' && modelLower !== 'socialteammembers') return false;
  if (!params.where || typeof params.where !== 'object') return false;

  const allowedActions = new Set(['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy']);
  if (!allowedActions.has(params.action)) return false;

  // Only allow direct lookup by user_id without OR branches.
  // This supports resolving a user's org memberships during bootstrap.
  if (hasDirectKey(params.where, 'OR')) return false;
  return hasDirectKey(params.where, 'user_id') || hasDirectKey(params.where, 'userId');
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
    'social_system_settings',
    'global_settings',
    'User',
    'users',
    ...(options?.excludedModels ?? []),
  ]);

  prisma.$use(async (params, next) => {
    const model = params.model;
    if (!model || excludedModels.has(model)) {
      return next(params);
    }

    const req = modelScopeRequirements.get(model);
    if (!req) {
      return next(params);
    }

    const args = (params.args ?? {}) as Record<string, unknown>;
    const override = (args as unknown as Record<PropertyKey, unknown>)[TENANT_ISOLATION_OVERRIDE] as TenantIsolationContext | undefined;
    const where = (args as { where?: unknown }).where;
    const action = params.action;

    const expected = getExpectedScope(override);

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
      if (req.requiresOrg && !isWhereScoped(where, ORG_KEYS)) {
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
        if (process.env.NODE_ENV !== 'production' && model === 'social_users') {
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
      if (req.requiresOrg && expected.organizationId && !whereMatchesScope(where, ORG_KEYS, expected.organizationId)) {
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
