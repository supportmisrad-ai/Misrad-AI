import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';
import { getClientIpFromRequest, rateLimit } from './rateLimit';

type RateWindow = { limit: number; windowMs: number; label: string };

type AIGuardLimits = {
  ipMin?: RateWindow;
  userMin?: RateWindow;
  userDay?: RateWindow;
  org10m?: RateWindow;
  orgDay?: RateWindow;
};

type AiAbuseGuardParams = {
  req: Request;
  namespace: string;
  organizationId?: string | null;
  userId?: string | null;
  limits?: AIGuardLimits;
};

type AiAbuseGuardResult =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; headers: Record<string, string> };

type InMemoryBucket = {
  count: number;
  resetAt: number;
};

type _AiGlobalCaches = typeof globalThis & {
  __MISRAD_AI_CONCURRENCY_LOCAL__?: Map<string, InMemoryBucket>;
  __MISRAD_AI_CONCURRENCY_INFLIGHT__?: Map<string, number>;
};

const _g = globalThis as _AiGlobalCaches;

const localConcurrency: Map<string, InMemoryBucket> =
  _g.__MISRAD_AI_CONCURRENCY_LOCAL__ || (_g.__MISRAD_AI_CONCURRENCY_LOCAL__ = new Map());

const localInFlight: Map<string, number> = _g.__MISRAD_AI_CONCURRENCY_INFLIGHT__ || (_g.__MISRAD_AI_CONCURRENCY_INFLIGHT__ = new Map());

function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

function buildRateLimitHeaders(params: {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
  label?: string;
}) {
  const suffix = params.label ? `-${params.label}` : '';
  const headers: Record<string, string> = {
    [`X-RateLimit-Limit${suffix}`]: String(params.limit),
    [`X-RateLimit-Remaining${suffix}`]: String(Math.max(0, params.remaining)),
    [`X-RateLimit-Reset${suffix}`]: String(Math.floor(params.resetAt / 1000)),
  };
  if (params.retryAfterSeconds) headers['Retry-After'] = String(params.retryAfterSeconds);
  return headers;
}

async function enforceRateLimit(params: { namespace: string; key: string; limit: number; windowMs: number; label: string }) {
  const rl = await rateLimit({
    namespace: params.namespace,
    key: params.key,
    limit: params.limit,
    windowMs: params.windowMs,
  });

  if (!rl.ok) {
    return {
      ok: false as const,
      headers: buildRateLimitHeaders({
        limit: params.limit,
        remaining: 0,
        resetAt: rl.resetAt,
        retryAfterSeconds: rl.retryAfterSeconds,
        label: params.label,
      }),
    };
  }

  return {
    ok: true as const,
    headers: buildRateLimitHeaders({ limit: params.limit, remaining: rl.remaining, resetAt: rl.resetAt, label: params.label }),
  };
}

function mergeHeaders(parts: Array<Record<string, string> | undefined | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) out[k] = v;
  }
  return out;
}

function getLimitsOrDefaults(limits?: AIGuardLimits): Required<AIGuardLimits> {
  return {
    ipMin: limits?.ipMin ?? { limit: 20, windowMs: 60_000, label: 'ip-min' },
    userMin: limits?.userMin ?? { limit: 10, windowMs: 60_000, label: 'user-min' },
    userDay: limits?.userDay ?? { limit: 500, windowMs: 24 * 60 * 60_000, label: 'user-day' },
    org10m: limits?.org10m ?? { limit: 120, windowMs: 10 * 60_000, label: 'org-10m' },
    orgDay: limits?.orgDay ?? { limit: 5000, windowMs: 24 * 60 * 60_000, label: 'org-day' },
  };
}

export async function enforceAiAbuseGuard(params: AiAbuseGuardParams): Promise<AiAbuseGuardResult> {
  const ip = getClientIpFromRequest(params.req);
  const limits = getLimitsOrDefaults(params.limits);

  const namespacePrefix = String(params.namespace || 'ai').trim() || 'ai';

  const ipRes = await enforceRateLimit({
    namespace: `${namespacePrefix}.ip_min`,
    key: ip,
    limit: limits.ipMin.limit,
    windowMs: limits.ipMin.windowMs,
    label: limits.ipMin.label,
  });
  if (!ipRes.ok) return { ok: false, headers: ipRes.headers };

  const headersParts: Array<Record<string, string>> = [ipRes.headers];

  if (params.organizationId && params.userId) {
    const userKey = `${String(params.organizationId)}:${String(params.userId)}`;

    const userRes = await enforceRateLimit({
      namespace: `${namespacePrefix}.user_min`,
      key: userKey,
      limit: limits.userMin.limit,
      windowMs: limits.userMin.windowMs,
      label: limits.userMin.label,
    });
    if (!userRes.ok) return { ok: false, headers: mergeHeaders([ipRes.headers, userRes.headers]) };

    const userDayRes = await enforceRateLimit({
      namespace: `${namespacePrefix}.user_day`,
      key: userKey,
      limit: limits.userDay.limit,
      windowMs: limits.userDay.windowMs,
      label: limits.userDay.label,
    });
    if (!userDayRes.ok) return { ok: false, headers: mergeHeaders([ipRes.headers, userRes.headers, userDayRes.headers]) };

    headersParts.push(userRes.headers, userDayRes.headers);
  }

  if (params.organizationId) {
    const orgKey = String(params.organizationId);

    const orgRes = await enforceRateLimit({
      namespace: `${namespacePrefix}.org_10m`,
      key: orgKey,
      limit: limits.org10m.limit,
      windowMs: limits.org10m.windowMs,
      label: limits.org10m.label,
    });
    if (!orgRes.ok) return { ok: false, headers: mergeHeaders([...headersParts, orgRes.headers]) };

    const orgDayRes = await enforceRateLimit({
      namespace: `${namespacePrefix}.org_day`,
      key: orgKey,
      limit: limits.orgDay.limit,
      windowMs: limits.orgDay.windowMs,
      label: limits.orgDay.label,
    });
    if (!orgDayRes.ok) return { ok: false, headers: mergeHeaders([...headersParts, orgRes.headers, orgDayRes.headers]) };

    headersParts.push(orgRes.headers, orgDayRes.headers);
  }

  return { ok: true, headers: mergeHeaders(headersParts) };
}

export async function withAiLoadIsolation<T>(params: {
  namespace: string;
  organizationId?: string | null;
  ttlMs?: number;
  maxGlobal?: number;
  maxPerOrg?: number;
  task: () => Promise<T>;
}): Promise<T> {
  const redis = getRedisClient();
  const ttlMs = typeof params.ttlMs === 'number' ? params.ttlMs : 45_000;
  const maxGlobal = typeof params.maxGlobal === 'number' ? params.maxGlobal : 8;
  const maxPerOrg = typeof params.maxPerOrg === 'number' ? params.maxPerOrg : 2;

  const orgId = params.organizationId ? String(params.organizationId) : null;
  const localKey = stableHash(`${String(params.namespace || 'ai')}:${orgId || '__no_org__'}`);

  const now = Date.now();
  const existing = localConcurrency.get(localKey);
  if (!existing || existing.resetAt <= now) {
    localConcurrency.set(localKey, { count: 0, resetAt: now + ttlMs });
  }

  const bucket = localConcurrency.get(localKey)!;
  if (bucket.count >= maxPerOrg) {
    const err: any = new Error('Overloaded');
    err.status = 503;
    err.retryAfterSeconds = 3;
    throw err;
  }

  bucket.count += 1;
  localConcurrency.set(localKey, bucket);

  const localInFlightKey = orgId || '__no_org__';
  const inflightCount = localInFlight.get(localInFlightKey) ?? 0;
  if (inflightCount >= maxPerOrg) {
    bucket.count = Math.max(0, bucket.count - 1);
    localConcurrency.set(localKey, bucket);

    const err: any = new Error('Overloaded');
    err.status = 503;
    err.retryAfterSeconds = 3;
    throw err;
  }

  localInFlight.set(localInFlightKey, inflightCount + 1);

  let redisKeys: { globalKey: string; orgKey?: string; acquired: boolean } = { globalKey: '', acquired: false };

  try {
    if (redis) {
      const ns = String(params.namespace || 'ai');
      const globalKey = `conc:${ns}:global`;
      const orgKey = orgId ? `conc:${ns}:org:${orgId}` : undefined;

      const globalCount = await redis.incr(globalKey);
      if (globalCount === 1) await redis.pexpire(globalKey, ttlMs);
      if (globalCount > maxGlobal) {
        await redis.decr(globalKey).catch(() => null);
        const err: any = new Error('Overloaded');
        err.status = 503;
        err.retryAfterSeconds = 3;
        throw err;
      }

      if (orgKey) {
        const orgCount = await redis.incr(orgKey);
        if (orgCount === 1) await redis.pexpire(orgKey, ttlMs);
        if (orgCount > maxPerOrg) {
          await redis.decr(orgKey).catch(() => null);
          await redis.decr(globalKey).catch(() => null);
          const err: any = new Error('Overloaded');
          err.status = 503;
          err.retryAfterSeconds = 3;
          throw err;
        }
      }

      redisKeys = { globalKey, orgKey, acquired: true };
    }

    return await params.task();
  } finally {
    localInFlight.set(localInFlightKey, Math.max(0, (localInFlight.get(localInFlightKey) ?? 1) - 1));

    const b = localConcurrency.get(localKey);
    if (b) {
      b.count = Math.max(0, b.count - 1);
      localConcurrency.set(localKey, b);
    }

    if (redis && redisKeys.acquired) {
      await redis.decr(redisKeys.globalKey).catch(() => null);
      if (redisKeys.orgKey) await redis.decr(redisKeys.orgKey).catch(() => null);
    }
  }
}
