/**
 * AI Chat — L1 + Redis two-tier cache and load isolation.
 * Extracted from route.ts to reduce handler file size.
 */

import { createHash } from 'crypto';
import { getUpstashRedisClient } from '@/lib/server/upstashRedis';

export type CachedChatResponse = {
  text: string;
  provider?: string | null;
  model?: string | null;
  chargedCents?: number | null;
  memory?: Array<{ docKey: string; similarity: number; chunkIndex: number; content: string; metadata: unknown }>;
};

type CacheEntry = { expiresAt: number; value: CachedChatResponse };

type _ChatGlobalCaches = typeof globalThis & {
  __MISRAD_AI_CHAT_RESPONSE_CACHE__?: Map<string, CacheEntry>;
  __MISRAD_AI_CHAT_INFLIGHT__?: Map<string, Promise<CachedChatResponse>>;
  __MISRAD_AI_CHAT_LOCAL_ORG_INFLIGHT__?: Map<string, number>;
};

const _g = globalThis as _ChatGlobalCaches;

const l1Cache: Map<string, CacheEntry> =
  _g.__MISRAD_AI_CHAT_RESPONSE_CACHE__ || (_g.__MISRAD_AI_CHAT_RESPONSE_CACHE__ = new Map());

export const inflightByKey: Map<string, Promise<CachedChatResponse>> =
  _g.__MISRAD_AI_CHAT_INFLIGHT__ || (_g.__MISRAD_AI_CHAT_INFLIGHT__ = new Map());

const localOrgInFlight: Map<string, number> =
  _g.__MISRAD_AI_CHAT_LOCAL_ORG_INFLIGHT__ || (_g.__MISRAD_AI_CHAT_LOCAL_ORG_INFLIGHT__ = new Map());

const CACHE_TTL_MS = 30_000;
const MAX_L1_CACHE_ENTRIES = 400;
const REDIS_CACHE_PREFIX = 'ai_chat:';
const REDIS_CACHE_TTL_SECONDS = 120;

export function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function getRedisClient() {
  return getUpstashRedisClient();
}

function l1Get(key: string): CachedChatResponse | null {
  const e = l1Cache.get(key);
  if (!e) return null;
  if (e.expiresAt <= Date.now()) {
    l1Cache.delete(key);
    return null;
  }
  return e.value;
}

function l1Set(key: string, value: CachedChatResponse) {
  const now = Date.now();
  l1Cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  if (l1Cache.size > MAX_L1_CACHE_ENTRIES) {
    const toDelete = Math.max(1, Math.floor(MAX_L1_CACHE_ENTRIES * 0.1));
    const keys = [...l1Cache.keys()].slice(0, toDelete);
    for (const k of keys) l1Cache.delete(k);
  }
}

export async function cacheGet(key: string): Promise<CachedChatResponse | null> {
  const l1Hit = l1Get(key);
  if (l1Hit) return l1Hit;

  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get<CachedChatResponse>(`${REDIS_CACHE_PREFIX}${key}`);
    if (raw && typeof raw === 'object' && 'text' in raw) {
      l1Set(key, raw);
      return raw;
    }
  } catch {
    // Redis failure is non-fatal
  }
  return null;
}

export async function cacheSet(key: string, value: CachedChatResponse): Promise<void> {
  l1Set(key, value);
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(`${REDIS_CACHE_PREFIX}${key}`, value, { ex: REDIS_CACHE_TTL_SECONDS });
  } catch {
    // Redis failure is non-fatal
  }
}

type ErrorWithStatus = Error & { status?: number; retryAfterSeconds?: number; name?: string };

export function withStatus(err: Error, status: number, retryAfterSeconds?: number): ErrorWithStatus {
  const e = err as ErrorWithStatus;
  e.status = status;
  if (typeof retryAfterSeconds === 'number') e.retryAfterSeconds = retryAfterSeconds;
  return e;
}

export async function withLoadIsolation<T>(params: { organizationId?: string | null; task: () => Promise<T> }): Promise<T> {
  const redis = getRedisClient();
  const ttlMs = 45_000;
  const maxGlobal = 8;
  const maxPerOrg = 2;

  const orgId = params.organizationId ? String(params.organizationId) : null;

  const localKey = orgId || '__no_org__';
  const localCount = localOrgInFlight.get(localKey) ?? 0;
  if (localCount >= maxPerOrg) {
    throw withStatus(new Error('Overloaded'), 503, 3);
  }

  localOrgInFlight.set(localKey, localCount + 1);

  let redisKeys: { globalKey: string; orgKey?: string; acquired: boolean } = { globalKey: '', acquired: false };
  try {
    if (redis) {
      const globalKey = `conc:ai_chat:global`;
      const orgKey = orgId ? `conc:ai_chat:org:${orgId}` : undefined;

      const globalCount = await redis.incr(globalKey);
      if (globalCount === 1) await redis.pexpire(globalKey, ttlMs);
      if (globalCount > maxGlobal) {
        await redis.decr(globalKey).catch(() => null);
        throw withStatus(new Error('Overloaded'), 503, 3);
      }

      if (orgKey) {
        const orgCount = await redis.incr(orgKey);
        if (orgCount === 1) await redis.pexpire(orgKey, ttlMs);
        if (orgCount > maxPerOrg) {
          await redis.decr(orgKey).catch(() => null);
          await redis.decr(globalKey).catch(() => null);
          throw withStatus(new Error('Overloaded'), 503, 3);
        }
      }

      redisKeys = { globalKey, orgKey, acquired: true };
    }

    return await params.task();
  } finally {
    localOrgInFlight.set(localKey, Math.max(0, (localOrgInFlight.get(localKey) ?? 1) - 1));
    if (redis && redisKeys.acquired) {
      await redis.decr(redisKeys.globalKey).catch(() => null);
      if (redisKeys.orgKey) await redis.decr(redisKeys.orgKey).catch(() => null);
    }
  }
}
