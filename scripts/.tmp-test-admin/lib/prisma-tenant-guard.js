"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPrismaTenantIsolationOverride = withPrismaTenantIsolationOverride;
exports.withTenantIsolationContext = withTenantIsolationContext;
exports.installPrismaTenantGuard = installPrismaTenantGuard;
const client_1 = require("@prisma/client");
const Sentry = __importStar(require("@sentry/nextjs"));
const node_async_hooks_1 = require("node:async_hooks");
const ORG_KEYS = new Set(['organizationId', 'organization_id']);
const TENANT_KEYS = new Set(['tenantId', 'tenant_id']);
const tenantIsolationAls = new node_async_hooks_1.AsyncLocalStorage();
const TENANT_ISOLATION_OVERRIDE = Symbol.for('misrad.prismaTenantIsolationOverride');
function withPrismaTenantIsolationOverride(args, ctx) {
    args[TENANT_ISOLATION_OVERRIDE] = ctx;
    return args;
}
async function withTenantIsolationContext(ctx, fn) {
    const current = tenantIsolationAls.getStore() ?? {};
    return tenantIsolationAls.run({ ...current, ...ctx }, fn);
}
function shouldReportTenantIsolation(override) {
    if (override?.suppressReporting === true)
        return false;
    return tenantIsolationAls.getStore()?.suppressReporting !== true;
}
function normalizeScopeId(value) {
    const v = typeof value === 'string' ? value.trim() : '';
    return v ? v : null;
}
const modelScopeRequirements = new Map(client_1.Prisma.dmmf.datamodel.models
    .map((m) => {
    const fieldNames = new Set(m.fields.map((f) => f.name));
    const requiresOrg = Array.from(ORG_KEYS).some((k) => fieldNames.has(k));
    const requiresTenant = Array.from(TENANT_KEYS).some((k) => fieldNames.has(k));
    const orgField = requiresOrg ? Array.from(ORG_KEYS).find((k) => fieldNames.has(k)) : undefined;
    const tenantField = requiresTenant ? Array.from(TENANT_KEYS).find((k) => fieldNames.has(k)) : undefined;
    return [m.name, { requiresOrg, requiresTenant, orgField, tenantField }];
})
    .filter(([, req]) => req.requiresOrg || req.requiresTenant));
function getExpectedScope(override) {
    const store = tenantIsolationAls.getStore();
    return {
        organizationId: normalizeScopeId(override?.organizationId ?? store?.organizationId),
        tenantId: normalizeScopeId(override?.tenantId ?? store?.tenantId),
    };
}
function isGlobalAdminContextAllowed(override) {
    const store = tenantIsolationAls.getStore();
    const mode = override?.mode ?? store?.mode;
    if (mode !== 'global_admin')
        return false;
    return (override?.isSuperAdmin ?? store?.isSuperAdmin) === true;
}
function captureTenantIsolation(params) {
    if (!shouldReportTenantIsolation(params.override))
        return;
    try {
        const err = new Error(params.message);
        Sentry.withScope((scope) => {
            scope.setTag('TenantIsolation', 'true');
            const source = params.override?.source ?? tenantIsolationAls.getStore()?.source;
            if (source)
                scope.setTag('tenant_isolation_context', source);
            if (params.tags) {
                for (const [k, v] of Object.entries(params.tags))
                    scope.setTag(k, v);
            }
            if (params.extra) {
                for (const [k, v] of Object.entries(params.extra))
                    scope.setExtra(k, v);
            }
            Sentry.captureException(err);
        });
    }
    catch {
        // ignore
    }
}
function reportTenantIsolationBlocked(params) {
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
function isPlainObject(value) {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}
function valueMatchesScope(expected, v) {
    if (typeof v === 'string')
        return v.trim() === expected;
    if (!v || typeof v !== 'object' || Array.isArray(v))
        return false;
    const obj = v;
    const equals = obj.equals;
    if (typeof equals === 'string')
        return equals.trim() === expected;
    const inVal = obj.in;
    if (Array.isArray(inVal)) {
        const normalized = inVal.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
        return normalized.length === 1 && normalized[0] === expected;
    }
    return false;
}
function whereMatchesScope(where, keys, expected) {
    if (!where)
        return false;
    if (Array.isArray(where))
        return where.every((v) => whereMatchesScope(v, keys, expected));
    if (!isPlainObject(where))
        return true;
    for (const [k, v] of Object.entries(where)) {
        if (keys.has(k)) {
            if (v == null)
                return false;
            if (!valueMatchesScope(expected, v))
                return false;
            continue;
        }
        if (!whereMatchesScope(v, keys, expected))
            return false;
    }
    return true;
}
function applyScopeToCreateData(params) {
    const { action, data, field, expected } = params;
    if (action === 'createMany' || action === 'createManyAndReturn') {
        if (!Array.isArray(data))
            return data;
        return data.map((row) => applyScopeToCreateData({ action: 'create', data: row, field, expected }));
    }
    if (!isPlainObject(data))
        return data;
    if (Object.prototype.hasOwnProperty.call(data, field)) {
        const current = data[field];
        if (current != null && !valueMatchesScope(expected, current)) {
            return TENANT_ISOLATION_OVERRIDE;
        }
        return { ...data, [field]: expected };
    }
    return { ...data, [field]: expected };
}
function hasFilterForKeys(value, keys) {
    if (!value || typeof value !== 'object')
        return false;
    if (Array.isArray(value))
        return value.some((v) => hasFilterForKeys(v, keys));
    for (const [k, v] of Object.entries(value)) {
        if (keys.has(k)) {
            if (v == null)
                return false;
            if (typeof v === 'string')
                return v.trim().length > 0;
            return true;
        }
        if (hasFilterForKeys(v, keys))
            return true;
    }
    return false;
}
function hasScopedDataForCreateAction(action, data, keys) {
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
function hasDirectScopedKey(where, keys) {
    for (const k of Object.keys(where)) {
        if (!keys.has(k))
            continue;
        const v = where[k];
        if (v == null)
            return false;
        if (typeof v === 'string')
            return v.trim().length > 0;
        return true;
    }
    return false;
}
function ensureTenantScopeIsGuaranteed(where, keys) {
    if (!where)
        return false;
    if (Array.isArray(where)) {
        return where.some((v) => ensureTenantScopeIsGuaranteed(v, keys));
    }
    if (!isPlainObject(where))
        return false;
    const obj = where;
    if (hasDirectScopedKey(obj, keys))
        return true;
    const andVal = obj.AND;
    if (andVal) {
        if (Array.isArray(andVal)) {
            if (andVal.some((v) => ensureTenantScopeIsGuaranteed(v, keys)))
                return true;
        }
        else {
            if (ensureTenantScopeIsGuaranteed(andVal, keys))
                return true;
        }
    }
    const orVal = obj.OR;
    if (orVal) {
        const branches = Array.isArray(orVal) ? orVal : [orVal];
        return branches.length > 0 && branches.every((b) => ensureTenantScopeIsGuaranteed(b, keys));
    }
    for (const [k, v] of Object.entries(obj)) {
        if (k === 'AND' || k === 'OR' || k === 'NOT')
            continue;
        if (keys.has(k))
            continue;
        if (ensureTenantScopeIsGuaranteed(v, keys))
            return true;
    }
    return false;
}
function validateNoUnscopedOr(where, keys, hasGlobalScope) {
    if (!where)
        return true;
    if (Array.isArray(where))
        return where.every((v) => validateNoUnscopedOr(v, keys, hasGlobalScope));
    if (!isPlainObject(where))
        return true;
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
        if (!andNodes.every((n) => validateNoUnscopedOr(n, keys, globalScopeHere)))
            return false;
    }
    if (orVal) {
        const orNodes = Array.isArray(orVal) ? orVal : [orVal];
        if (!orNodes.every((n) => validateNoUnscopedOr(n, keys, globalScopeHere)))
            return false;
    }
    const notVal = obj.NOT;
    if (notVal) {
        const notNodes = Array.isArray(notVal) ? notVal : [notVal];
        if (!notNodes.every((n) => validateNoUnscopedOr(n, keys, globalScopeHere)))
            return false;
    }
    for (const [k, v] of Object.entries(obj)) {
        if (k === 'AND' || k === 'OR' || k === 'NOT')
            continue;
        if (!validateNoUnscopedOr(v, keys, globalScopeHere))
            return false;
    }
    return true;
}
function isEmployeeInvitationLookupByTokenUnscopedAllowed(params) {
    const modelLower = String(params.model || '').toLowerCase();
    if (modelLower !== 'nexus_employee_invitation_links')
        return false;
    const allowedActions = new Set(['findUnique', 'findFirst']);
    if (!allowedActions.has(params.action))
        return false;
    const where = params.args?.where;
    if (!where || typeof where !== 'object')
        return false;
    if (hasDirectKey(where, 'OR'))
        return false;
    if (!hasDirectKey(where, 'token'))
        return false;
    if (isPlainObject(where)) {
        const keys = Object.keys(where);
        if (keys.length !== 1 || keys[0] !== 'token')
            return false;
    }
    return true;
}
function isWhereScoped(where, keys) {
    if (!ensureTenantScopeIsGuaranteed(where, keys))
        return false;
    return validateNoUnscopedOr(where, keys, false);
}
function hasDirectKey(where, key) {
    if (!where || typeof where !== 'object')
        return false;
    if (Array.isArray(where))
        return where.some((v) => hasDirectKey(v, key));
    return Object.prototype.hasOwnProperty.call(where, key);
}
function isProfileLookupByClerkUserIdUnscopedAllowed(params) {
    const modelLower = String(params.model || '').toLowerCase();
    if (modelLower !== 'profile')
        return false;
    if (!params.where || typeof params.where !== 'object')
        return false;
    const allowedActions = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow']);
    if (!allowedActions.has(params.action))
        return false;
    // Only allow direct lookup by clerkUserId without OR branches.
    // Profile has @@unique([organizationId, clerkUserId]) so this is not a cross-tenant list.
    // This exception exists to enable bootstrap and resolve organizationId from the logged-in user's clerkUserId.
    if (hasDirectKey(params.where, 'OR'))
        return false;
    return hasDirectKey(params.where, 'clerkUserId');
}
function isSocialUserLookupByClerkUserIdUnscopedAllowed(params) {
    const modelLower = String(params.model || '').toLowerCase();
    if (modelLower !== 'social_users' && modelLower !== 'socialusers')
        return false;
    if (!params.where || typeof params.where !== 'object')
        return false;
    const allowedActions = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'update']);
    if (!allowedActions.has(params.action))
        return false;
    if (hasDirectKey(params.where, 'OR'))
        return false;
    return hasDirectKey(params.where, 'clerk_user_id') || hasDirectKey(params.where, 'clerkUserId');
}
function isSocialTeamMembersLookupByUserIdUnscopedAllowed(params) {
    const modelLower = String(params.model || '').toLowerCase();
    if (modelLower !== 'social_team_members' && modelLower !== 'socialteammembers')
        return false;
    if (!params.where || typeof params.where !== 'object')
        return false;
    const allowedActions = new Set(['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy']);
    if (!allowedActions.has(params.action))
        return false;
    // Only allow direct lookup by user_id without OR branches.
    // This supports resolving a user's org memberships during bootstrap.
    if (hasDirectKey(params.where, 'OR'))
        return false;
    return hasDirectKey(params.where, 'user_id') || hasDirectKey(params.where, 'userId');
}
function isNexusUserLookupByEmailUnscopedAllowed(params) {
    const modelLower = String(params.model || '').toLowerCase();
    if (modelLower !== 'nexususer')
        return false;
    const allowedActions = new Set(['findMany', 'findFirst']);
    if (!allowedActions.has(params.action))
        return false;
    const where = params.args?.where;
    if (!where || typeof where !== 'object')
        return false;
    if (hasDirectKey(where, 'OR'))
        return false;
    // Narrow allowlist: exact lookup by email only, for bootstrap flows.
    if (!hasDirectKey(where, 'email'))
        return false;
    const takeRaw = params.args?.take;
    if (takeRaw !== undefined) {
        const take = Number(takeRaw);
        if (!Number.isFinite(take) || take > 2)
            return false;
    }
    return true;
}
function installPrismaTenantGuard(prisma, options) {
    const excludedModels = new Set([
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
        const args = (params.args ?? {});
        const override = args[TENANT_ISOLATION_OVERRIDE];
        const where = args.where;
        const action = params.action;
        const expected = getExpectedScope(override);
        const isGlobalAdmin = isGlobalAdminContextAllowed(override);
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
                if (process.env.NODE_ENV !== 'production' && model === 'social_users') {
                    try {
                        console.error('[tenant-guard] missing organization scope for social_users', {
                            action,
                            whereType: typeof where,
                            whereKeys: isPlainObject(where) ? Object.keys(where) : null,
                            hasClerkUserIdKey: hasDirectKey(where, 'clerk_user_id') || hasDirectKey(where, 'clerkUserId'),
                        });
                    }
                    catch {
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
            }
            else {
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
