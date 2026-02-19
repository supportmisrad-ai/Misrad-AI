/**
 * Edge-compatible global rate limiter for proxy.ts (Next.js middleware).
 * Uses @upstash/redis REST API (works in edge runtime).
 * Falls back to in-memory Map when Redis is unavailable.
 *
 * Default: 200 requests per minute per IP.
 * Configure via MISRAD_GLOBAL_RATE_LIMIT / MISRAD_GLOBAL_RATE_WINDOW_MS env vars.
 */

import { Redis } from '@upstash/redis';

// ─── Config ─────────────────────────────────────────────────────────────────

const LIMIT = (() => {
  const raw = Number(process.env.MISRAD_GLOBAL_RATE_LIMIT || 200);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 200;
})();

const WINDOW_MS = (() => {
  const raw = Number(process.env.MISRAD_GLOBAL_RATE_WINDOW_MS || 60_000);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60_000;
})();

// ─── In-memory fallback ─────────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number };

declare global {
  var __MISRAD_EDGE_RL_BUCKETS__: Map<string, Bucket> | undefined;
}

const buckets: Map<string, Bucket> = (() => {
  if (globalThis.__MISRAD_EDGE_RL_BUCKETS__) return globalThis.__MISRAD_EDGE_RL_BUCKETS__;
  const m = new Map<string, Bucket>();
  globalThis.__MISRAD_EDGE_RL_BUCKETS__ = m;
  return m;
})();

// ─── Redis singleton ────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

// ─── IP extraction (edge-safe — no Node crypto) ─────────────────────────────

function getIp(req: Request): string {
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

// ─── Public API ─────────────────────────────────────────────────────────────

export type EdgeRateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export async function edgeGlobalRateLimit(req: Request): Promise<EdgeRateLimitResult> {
  const ip = getIp(req);

  // In development, skip rate limiting for localhost to prevent 429 cascades
  // that poison Clerk token refresh and cause infinite loops.
  const isDev = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
  if (isDev && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === 'unknown')) {
    return { allowed: true, remaining: LIMIT };
  }

  const key = `erl:${ip}`;

  const redis = getRedis();

  // ── Try Redis first ────────────────────────────────────────────────────
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, WINDOW_MS);
      }

      if (count > LIMIT) {
        let pttl = await redis.pttl(key);
        if (pttl < 0) pttl = WINDOW_MS;
        const retryAfterSeconds = Math.max(1, Math.ceil(pttl / 1000));
        return { allowed: false, retryAfterSeconds };
      }

      return { allowed: true, remaining: Math.max(0, LIMIT - count) };
    } catch {
      // Fall through to in-memory
    }
  }

  // ── In-memory fallback ─────────────────────────────────────────────────
  const now = Date.now();
  // Use 80% of configured limit (not /3 which was too aggressive)
  const degradedLimit = Math.max(1, Math.floor(LIMIT * 0.8));

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: degradedLimit - 1 };
  }

  if (existing.count >= degradedLimit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(0, degradedLimit - existing.count) };
}
