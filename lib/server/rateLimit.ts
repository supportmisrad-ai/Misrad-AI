import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';

export type RateLimitMode = 'normal' | 'fail_closed' | 'degraded';

type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number; degraded?: boolean }
  | {
      ok: false;
      remaining: 0;
      resetAt: number;
      retryAfterSeconds: number;
      reason: 'limited' | 'unavailable';
      degraded?: boolean;
    };

type RateLimitOptions = {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
  mode?: RateLimitMode;
  degradedLimit?: number;
  degradedWindowMs?: number;
  unavailableRetryAfterSeconds?: number;
};

type InMemoryBucket = {
  count: number;
  resetAt: number;
};

type RedisBucket = {
  count: number;
  pttl: number; // milliseconds
};

declare global {
  var __MISRAD_RATE_LIMIT_BUCKETS__: Map<string, InMemoryBucket> | undefined;
}

const globalBuckets: Map<string, InMemoryBucket> = (() => {
  if (globalThis.__MISRAD_RATE_LIMIT_BUCKETS__) return globalThis.__MISRAD_RATE_LIMIT_BUCKETS__;
  const m = new Map<string, InMemoryBucket>();
  globalThis.__MISRAD_RATE_LIMIT_BUCKETS__ = m;
  return m;
})();

export function getClientIpFromRequest(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();

  return 'unknown';
}

export function buildRateLimitHeaders(params: {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
  label?: string;
}): Record<string, string> {
  const suffix = params.label ? `-${params.label}` : '';
  const headers: Record<string, string> = {
    [`X-RateLimit-Limit${suffix}`]: String(params.limit),
    [`X-RateLimit-Remaining${suffix}`]: String(Math.max(0, params.remaining)),
    [`X-RateLimit-Reset${suffix}`]: String(Math.floor(params.resetAt / 1000)),
  };
  if (params.retryAfterSeconds) headers['Retry-After'] = String(params.retryAfterSeconds);
  return headers;
}

function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function isRedisDisabledExplicitly(): boolean {
  const disabled = String(process.env.MISRAD_RATE_LIMIT_DISABLE_REDIS || '').toLowerCase();
  return disabled === '1' || disabled === 'true';
}

function getRedisClient(): Redis | null {
  if (isRedisDisabledExplicitly()) return null;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

async function redisIncrementWithTtl(params: {
  redis: Redis;
  key: string;
  windowMs: number;
}): Promise<RedisBucket> {
  const { redis, key, windowMs } = params;

  const count = await redis.incr(key);

  // First hit: set the window TTL.
  if (count === 1) {
    await redis.pexpire(key, windowMs);
  }

  let pttl = await redis.pttl(key);
  // If TTL is missing for any reason, enforce it.
  if (pttl < 0) {
    await redis.pexpire(key, windowMs);
    pttl = windowMs;
  }

  return { count, pttl };
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const bucketKey = stableHash(`${opts.namespace}:${opts.key}`);

  const mode: RateLimitMode = opts.mode ?? 'normal';
  const unavailableRetryAfterSeconds =
    typeof opts.unavailableRetryAfterSeconds === 'number' && Number.isFinite(opts.unavailableRetryAfterSeconds) && opts.unavailableRetryAfterSeconds > 0
      ? Math.floor(opts.unavailableRetryAfterSeconds)
      : 3;

  const redisDisabled = isRedisDisabledExplicitly();
  const isE2eTesting = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true' || String(process.env.IS_E2E_TESTING || '') === '1';
  const enforceFailClosed = mode === 'fail_closed' && !redisDisabled && !isE2eTesting;

  const redis = getRedisClient();
  if (!redis && enforceFailClosed) {
    return {
      ok: false,
      remaining: 0,
      resetAt: now + unavailableRetryAfterSeconds * 1000,
      retryAfterSeconds: unavailableRetryAfterSeconds,
      reason: 'unavailable',
      degraded: false,
    };
  }

  let redisFailed = false;
  if (redis) {
    try {
      const redisKey = `rl:${bucketKey}`;
      const { count, pttl } = await redisIncrementWithTtl({
        redis,
        key: redisKey,
        windowMs: opts.windowMs,
      });

      const resetAt = now + Math.max(0, pttl);
      if (count > opts.limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil(Math.max(0, pttl) / 1000));
        return { ok: false, remaining: 0, resetAt, retryAfterSeconds, reason: 'limited', degraded: false };
      }

      return {
        ok: true,
        remaining: Math.max(0, opts.limit - count),
        resetAt,
        degraded: false,
      };
    } catch {
      redisFailed = true;
    }
  }

  if (enforceFailClosed && redisFailed) {
    return {
      ok: false,
      remaining: 0,
      resetAt: now + unavailableRetryAfterSeconds * 1000,
      retryAfterSeconds: unavailableRetryAfterSeconds,
      reason: 'unavailable',
      degraded: false,
    };
  }

  const isDegraded = !redis || redisFailed;
  const effectiveWindowMs =
    mode === 'degraded' && isDegraded
      ? typeof opts.degradedWindowMs === 'number' && Number.isFinite(opts.degradedWindowMs) && opts.degradedWindowMs > 0
        ? Math.floor(opts.degradedWindowMs)
        : Math.min(opts.windowMs, 30_000)
      : opts.windowMs;

  const effectiveLimit =
    mode === 'degraded' && isDegraded
      ? typeof opts.degradedLimit === 'number' && Number.isFinite(opts.degradedLimit) && opts.degradedLimit > 0
        ? Math.floor(opts.degradedLimit)
        : Math.max(1, Math.floor(opts.limit / 5))
      : opts.limit;

  const existing = globalBuckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + effectiveWindowMs;
    const next: InMemoryBucket = { count: 1, resetAt };
    globalBuckets.set(bucketKey, next);
    return {
      ok: true,
      remaining: Math.max(0, effectiveLimit - 1),
      resetAt,
      degraded: isDegraded,
    };
  }

  if (existing.count >= effectiveLimit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds,
      reason: 'limited',
      degraded: isDegraded,
    };
  }

  existing.count += 1;
  globalBuckets.set(bucketKey, existing);
  return {
    ok: true,
    remaining: Math.max(0, effectiveLimit - existing.count),
    resetAt: existing.resetAt,
    degraded: isDegraded,
  };
}
