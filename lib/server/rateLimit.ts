import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';
import { getUpstashRedisClient } from '@/lib/server/upstashRedis';

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
  return getUpstashRedisClient();
}

async function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<{ ok: true; value: T } | { ok: false }> {
  const ms = Math.max(1, Math.floor(timeoutMs));
  let timeout: NodeJS.Timeout | null = null;
  try {
    const timeoutPromise = new Promise<{ ok: false }>((resolve) => {
      timeout = setTimeout(() => resolve({ ok: false }), ms);
    });

    const result = await Promise.race([
      promise.then((value) => ({ ok: true as const, value })),
      timeoutPromise,
    ]);
    return result;
  } finally {
    if (timeout) clearTimeout(timeout);
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
  const shouldFailClosed = mode === 'fail_closed';
  const unavailableRetryAfterSeconds =
    typeof opts.unavailableRetryAfterSeconds === 'number' && Number.isFinite(opts.unavailableRetryAfterSeconds) && opts.unavailableRetryAfterSeconds > 0
      ? Math.floor(opts.unavailableRetryAfterSeconds)
      : 3;

  const enforceFailClosed = shouldFailClosed;

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
      const redisOp = redisIncrementWithTtl({
        redis,
        key: redisKey,
        windowMs: opts.windowMs,
      });
      // Avoid hanging requests if Upstash is down / network stalls.
      // NOTE: we can't cancel the underlying request; ensure we observe rejections.
      redisOp.catch(() => undefined);
      const timeoutMs = Number(process.env.MISRAD_RATE_LIMIT_REDIS_TIMEOUT_MS || 800);
      const timed = await promiseWithTimeout(redisOp, Number.isFinite(timeoutMs) ? timeoutMs : 800);
      if (!timed.ok) {
        throw new Error('Redis rate limit timeout');
      }
      const { count, pttl } = timed.value;

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

// ─── Global per-IP rate limiter ─────────────────────────────────────────────

const GLOBAL_RATE_LIMIT = (() => {
  const raw = Number(process.env.MISRAD_GLOBAL_RATE_LIMIT || 200);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 200;
})();

const GLOBAL_RATE_WINDOW_MS = (() => {
  const raw = Number(process.env.MISRAD_GLOBAL_RATE_WINDOW_MS || 60_000);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60_000;
})();

export type GlobalRateLimitResult =
  | { allowed: true; headers: Record<string, string> }
  | { allowed: false; headers: Record<string, string>; response: Response };

/**
 * Global per-IP rate limiter — call at the top of every API route handler.
 * Returns `{ allowed: true }` if the request is within limits, or
 * `{ allowed: false, response }` with a ready-to-return 429 Response.
 *
 * Limits: 200 req/min per IP (configurable via MISRAD_GLOBAL_RATE_LIMIT).
 * Falls back to in-memory if Redis is unavailable (degraded mode).
 */
export async function globalRateLimit(req: Request): Promise<GlobalRateLimitResult> {
  const ip = getClientIpFromRequest(req);

  const result = await rateLimit({
    namespace: 'global',
    key: ip,
    limit: GLOBAL_RATE_LIMIT,
    windowMs: GLOBAL_RATE_WINDOW_MS,
    mode: 'degraded',
    degradedLimit: Math.max(1, Math.floor(GLOBAL_RATE_LIMIT / 3)),
  });

  const headers = buildRateLimitHeaders({
    limit: GLOBAL_RATE_LIMIT,
    remaining: result.remaining,
    resetAt: result.resetAt,
    retryAfterSeconds: result.ok ? undefined : result.retryAfterSeconds,
    label: 'Global',
  });

  if (result.ok) {
    return { allowed: true, headers };
  }

  const body = JSON.stringify({
    error: 'Too many requests',
    retryAfterSeconds: result.retryAfterSeconds,
  });

  return {
    allowed: false,
    headers,
    response: new Response(body, {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...headers },
    }),
  };
}
