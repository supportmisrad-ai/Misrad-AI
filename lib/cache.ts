import { getUpstashRedisClient } from '@/lib/server/upstashRedis';

// ---------------------------------------------------------------------------
// Multi-tier cache: L1 (in-memory LRU) → L2 (Upstash Redis, optional)
//
// Usage:
//   import { cached, invalidateCache } from '@/lib/cache';
//
//   const getOrg = cached('org', { ttlSeconds: 30, swrSeconds: 60 }, async (orgId: string) => {
//     return prisma.organization.findUnique({ where: { id: orgId } });
//   });
//   const org = await getOrg('org_123');
//
//   // Invalidate after mutation:
//   invalidateCache('org', 'org_123');
// ---------------------------------------------------------------------------

declare global {
  var __MISRAD_CACHE_L1__: Map<string, L1Entry> | undefined;
}

type L1Entry = {
  value: unknown;
  expiresAt: number;
  staleUntil: number;
};

const DEFAULT_L1_MAX_ENTRIES = 2000;
const DEFAULT_TTL_SECONDS = 30;
const DEFAULT_SWR_SECONDS = 60;

// ---------------------------------------------------------------------------
// L1: process-scoped LRU Map
// ---------------------------------------------------------------------------
const l1: Map<string, L1Entry> =
  globalThis.__MISRAD_CACHE_L1__ ?? (globalThis.__MISRAD_CACHE_L1__ = new Map());

function l1Evict(): void {
  if (l1.size <= DEFAULT_L1_MAX_ENTRIES) return;
  const now = Date.now();
  const toDelete: string[] = [];
  for (const [key, entry] of l1) {
    if (entry.staleUntil <= now) toDelete.push(key);
    if (l1.size - toDelete.length <= DEFAULT_L1_MAX_ENTRIES * 0.8) break;
  }
  if (toDelete.length === 0) {
    const oldest = l1.keys().next().value;
    if (oldest !== undefined) toDelete.push(oldest);
  }
  for (const k of toDelete) l1.delete(k);
}

function l1Get(key: string): { hit: true; value: unknown; stale: boolean } | { hit: false } {
  const entry = l1.get(key);
  if (!entry) return { hit: false };
  const now = Date.now();
  if (entry.staleUntil <= now) {
    l1.delete(key);
    return { hit: false };
  }
  const stale = entry.expiresAt <= now;
  return { hit: true, value: entry.value, stale };
}

function l1Set(key: string, value: unknown, ttlMs: number, swrMs: number): void {
  const now = Date.now();
  l1.set(key, { value, expiresAt: now + ttlMs, staleUntil: now + ttlMs + swrMs });
  l1Evict();
}

function l1Delete(key: string): void {
  l1.delete(key);
}

function l1DeleteByPrefix(prefix: string): number {
  let count = 0;
  for (const key of l1.keys()) {
    if (key.startsWith(prefix)) {
      l1.delete(key);
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// L2: Upstash Redis (optional — gracefully degrades to L1-only)
// ---------------------------------------------------------------------------
const REDIS_KEY_PREFIX = 'cache:';
const REDIS_TIMEOUT_MS = 600;

async function l2Get(key: string): Promise<unknown | undefined> {
  const redis = getUpstashRedisClient();
  if (!redis) return undefined;
  try {
    const raw = await Promise.race([
      redis.get<string>(`${REDIS_KEY_PREFIX}${key}`),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), REDIS_TIMEOUT_MS)),
    ]);
    if (raw === null || raw === undefined) return undefined;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return undefined;
  }
}

async function l2Set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getUpstashRedisClient();
  if (!redis) return;
  try {
    const serialized = JSON.stringify(value);
    await Promise.race([
      redis.set(`${REDIS_KEY_PREFIX}${key}`, serialized, { ex: ttlSeconds }),
      new Promise<void>((resolve) => setTimeout(resolve, REDIS_TIMEOUT_MS)),
    ]);
  } catch {
    // Redis write failure is non-fatal
  }
}

async function l2Delete(key: string): Promise<void> {
  const redis = getUpstashRedisClient();
  if (!redis) return;
  try {
    await redis.del(`${REDIS_KEY_PREFIX}${key}`);
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type CacheOptions = {
  ttlSeconds?: number;
  swrSeconds?: number;
  l2?: boolean;
};

type CacheKey = string | number;

function buildKey(namespace: string, args: CacheKey[]): string {
  return `${namespace}:${args.map((a) => String(a)).join(':')}`;
}

const revalidating = new Set<string>();

/**
 * Wrap an async function with multi-tier caching.
 *
 * @param namespace - Cache namespace (e.g. 'org', 'entitlements')
 * @param options   - TTL, SWR, and whether to use Redis L2
 * @param fn        - The async function to cache
 * @returns A function with identical signature that returns cached results
 */
export function cached<TArgs extends CacheKey[], TResult>(
  namespace: string,
  options: CacheOptions,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const swrSeconds = options.swrSeconds ?? DEFAULT_SWR_SECONDS;
  const useL2 = options.l2 !== false;
  const ttlMs = ttlSeconds * 1000;
  const swrMs = swrSeconds * 1000;

  return async (...args: TArgs): Promise<TResult> => {
    const key = buildKey(namespace, args);

    // L1 check
    const l1Result = l1Get(key);
    if (l1Result.hit) {
      if (!l1Result.stale) return l1Result.value as TResult;

      // Stale-while-revalidate: return stale value, refresh in background
      if (!revalidating.has(key)) {
        revalidating.add(key);
        fn(...args)
          .then((fresh) => {
            l1Set(key, fresh, ttlMs, swrMs);
            if (useL2) l2Set(key, fresh, ttlSeconds + swrSeconds).catch(() => undefined);
          })
          .catch(() => undefined)
          .finally(() => revalidating.delete(key));
      }
      return l1Result.value as TResult;
    }

    // L2 check (Redis)
    if (useL2) {
      const l2Result = await l2Get(key);
      if (l2Result !== undefined) {
        l1Set(key, l2Result, ttlMs, swrMs);
        return l2Result as TResult;
      }
    }

    // Cache miss — fetch from source
    const result = await fn(...args);
    l1Set(key, result, ttlMs, swrMs);
    if (useL2) l2Set(key, result, ttlSeconds + swrSeconds).catch(() => undefined);
    return result;
  };
}

/**
 * Invalidate a single cache entry by namespace + args.
 */
export async function invalidateCache(namespace: string, ...args: CacheKey[]): Promise<void> {
  const key = buildKey(namespace, args);
  l1Delete(key);
  await l2Delete(key);
}

/**
 * Invalidate all cache entries under a namespace.
 */
export function invalidateCacheByNamespace(namespace: string): number {
  return l1DeleteByPrefix(`${namespace}:`);
}

/**
 * Get L1 cache stats for monitoring/diagnostics.
 */
export function getCacheStats(): { l1Size: number; l1MaxEntries: number } {
  return { l1Size: l1.size, l1MaxEntries: DEFAULT_L1_MAX_ENTRIES };
}
