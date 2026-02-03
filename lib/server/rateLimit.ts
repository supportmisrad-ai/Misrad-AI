import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';

type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSeconds: number };

type RateLimitOptions = {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
};

type InMemoryBucket = {
  count: number;
  resetAt: number;
};

type RedisBucket = {
  count: number;
  pttl: number; // milliseconds
};

type GlobalWithRateLimitBuckets = typeof globalThis & {
  __MISRAD_RATE_LIMIT_BUCKETS__?: Map<string, InMemoryBucket>;
};

const globalBuckets: Map<string, InMemoryBucket> = (() => {
  const g = globalThis as unknown as GlobalWithRateLimitBuckets;
  if (g.__MISRAD_RATE_LIMIT_BUCKETS__) return g.__MISRAD_RATE_LIMIT_BUCKETS__;
  const m = new Map<string, InMemoryBucket>();
  g.__MISRAD_RATE_LIMIT_BUCKETS__ = m;
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

  const redis = getRedisClient();
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
        return { ok: false, remaining: 0, resetAt, retryAfterSeconds };
      }

      return {
        ok: true,
        remaining: Math.max(0, opts.limit - count),
        resetAt,
      };
    } catch {
      // Fallback to in-memory below
    }
  }

  const existing = globalBuckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    const next: InMemoryBucket = { count: 1, resetAt };
    globalBuckets.set(bucketKey, next);
    return { ok: true, remaining: Math.max(0, opts.limit - 1), resetAt };
  }

  if (existing.count >= opts.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, remaining: 0, resetAt: existing.resetAt, retryAfterSeconds };
  }

  existing.count += 1;
  globalBuckets.set(bucketKey, existing);
  return { ok: true, remaining: Math.max(0, opts.limit - existing.count), resetAt: existing.resetAt };
}
