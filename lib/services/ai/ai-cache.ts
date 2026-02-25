/**
 * TTL-based in-memory cache utilities for AIService.
 * Extracted from AIService.ts to reduce class file size.
 */

export type CacheEntry<T> = { value: T; expiresAt: number };

export const CACHE_TTL = {
  FEATURE_SETTINGS: 60_000,
  PROVIDER_KEY: 300_000,
  MODEL_DISPLAY_NAME: 300_000,
  AI_DNA: 60_000,
} as const;

export const CACHE_MAX_SIZE = 200;

export function ttlGet<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function ttlSet<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (cache.size > CACHE_MAX_SIZE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}
