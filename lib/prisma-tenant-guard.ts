import { Prisma, PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { AsyncLocalStorage } from 'node:async_hooks';

const ORG_KEYS = new Set(['organizationId', 'organization_id']);
const TENANT_KEYS = new Set(['tenantId', 'tenant_id']);

type TenantIsolationContext = {
  suppressReporting?: boolean;
  source?: string;
};

const tenantIsolationAls = new AsyncLocalStorage<TenantIsolationContext>();

const TENANT_ISOLATION_OVERRIDE = Symbol.for('misrad.prismaTenantIsolationOverride');

export function withPrismaTenantIsolationOverride<T extends Record<string, any>>(
  args: T,
  ctx: TenantIsolationContext
): T {
  (args as any)[TENANT_ISOLATION_OVERRIDE] = ctx;
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

type ScopeRequirements = {
  requiresOrg: boolean;
  requiresTenant: boolean;
};

const modelScopeRequirements = new Map<string, ScopeRequirements>(
  Prisma.dmmf.datamodel.models
    .map((m) => {
      const fieldNames = new Set(m.fields.map((f) => f.name));
      const requiresOrg = Array.from(ORG_KEYS).some((k) => fieldNames.has(k));
      const requiresTenant = Array.from(TENANT_KEYS).some((k) => fieldNames.has(k));
      return [m.name, { requiresOrg, requiresTenant }] as const;
    })
    .filter(([, req]) => req.requiresOrg || req.requiresTenant)
);

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

function hasDirectScopedKey(where: Record<string, unknown>, keys: Set<string>): boolean {
  for (const k of Object.keys(where)) {
    if (!keys.has(k)) continue;
    const v = (where as any)[k];
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

function isWhereScoped(where: unknown, keys: Set<string>): boolean {
  if (!ensureTenantScopeIsGuaranteed(where, keys)) return false;
  return validateNoUnscopedOr(where, keys, false);
}

function hasDirectKey(where: unknown, key: string): boolean {
  if (!where || typeof where !== 'object') return false;
  if (Array.isArray(where)) return where.some((v) => hasDirectKey(v, key));
  return Object.prototype.hasOwnProperty.call(where as any, key);
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

    const args = (params.args ?? {}) as any;
    const override = args?.[TENANT_ISOLATION_OVERRIDE] as TenantIsolationContext | undefined;
    const where = args.where;
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
      if (req.requiresOrg && !isWhereScoped(where, ORG_KEYS)) {
        if (isProfileLookupByClerkUserIdUnscopedAllowed({ model, action, where })) {
          return next(params);
        }
        if (isSocialUserLookupByClerkUserIdUnscopedAllowed({ model, action, where })) {
          return next(params);
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
      if (req.requiresTenant && !isWhereScoped(where, TENANT_KEYS)) {
        const message = `Tenant Guard Violation! Missing Tenant ID. (${model}.${action})`;
        reportTenantIsolationBlocked({ message, model, action, reason: 'missing_tenantId_where', override });
        throw new Error(message);
      }
    }

    const actionsRequiringData = new Set(['create', 'createMany', 'upsert']);
    if (actionsRequiringData.has(action)) {
      if (action === 'upsert') {
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
        const data = args.data;
        if (req.requiresOrg && !hasFilterForKeys(data, ORG_KEYS)) {
          const message = `Tenant Guard Violation! Missing Organization ID. (${model}.${action})`;
          reportTenantIsolationBlocked({ message, model, action, reason: 'missing_organizationId_data', override });
          throw new Error(message);
        }
        if (req.requiresTenant && !hasFilterForKeys(data, TENANT_KEYS)) {
          const message = `Tenant Guard Violation! Missing Tenant ID. (${model}.${action})`;
          reportTenantIsolationBlocked({ message, model, action, reason: 'missing_tenantId_data', override });
          throw new Error(message);
        }
      }
    }

    return next(params);
  });
}
