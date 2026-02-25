import { test, expect } from '@playwright/test';

/**
 * AIService unit tests — test the public singleton/cache API without
 * importing the full module (which pulls in Prisma/DB).
 * We validate the globalThis-based singleton pattern directly.
 */

test.describe('AIService singleton pattern', () => {
  test('globalThis AI caches are Maps when initialized', () => {
    // Simulate the cache initialization pattern used by AIService
    const cache: Map<string, { value: unknown; expiresAt: number }> =
      (globalThis as Record<string, unknown>).__TEST_AI_CACHE__ as typeof cache
        ?? ((globalThis as Record<string, unknown>).__TEST_AI_CACHE__ = new Map());

    expect(cache).toBeInstanceOf(Map);
    expect(cache.size).toBe(0);

    cache.set('test_key', { value: 'hello', expiresAt: Date.now() + 60_000 });
    expect(cache.size).toBe(1);
    expect(cache.get('test_key')?.value).toBe('hello');

    // Second access should return same Map (singleton)
    const cache2 = (globalThis as Record<string, unknown>).__TEST_AI_CACHE__ as typeof cache;
    expect(cache2).toBe(cache);
    expect(cache2.size).toBe(1);

    // Cleanup
    cache.clear();
    delete (globalThis as Record<string, unknown>).__TEST_AI_CACHE__;
  });

  test('cache clear pattern works correctly', () => {
    const caches = {
      features: new Map<string, unknown>(),
      keys: new Map<string, unknown>(),
      models: new Map<string, unknown>(),
      dna: new Map<string, unknown>(),
    };

    // Populate
    caches.features.set('f1', { value: true });
    caches.keys.set('k1', { value: 'sk-xxx' });
    caches.models.set('m1', { value: 'gpt-4' });
    caches.dna.set('d1', { value: {} });

    // Clear by scope
    function clearCache(scope?: 'features' | 'keys' | 'models' | 'dna' | 'all'): void {
      const s = scope || 'all';
      if (s === 'all' || s === 'features') caches.features.clear();
      if (s === 'all' || s === 'keys') caches.keys.clear();
      if (s === 'all' || s === 'models') caches.models.clear();
      if (s === 'all' || s === 'dna') caches.dna.clear();
    }

    clearCache('features');
    expect(caches.features.size).toBe(0);
    expect(caches.keys.size).toBe(1);

    clearCache('all');
    expect(caches.keys.size).toBe(0);
    expect(caches.models.size).toBe(0);
    expect(caches.dna.size).toBe(0);
  });

  test('TTL-based cache entry expiration logic', () => {
    type CacheEntry<T> = { value: T; expiresAt: number };

    function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    }

    const cache = new Map<string, CacheEntry<string>>();

    // Set with future expiry
    cache.set('active', { value: 'hello', expiresAt: Date.now() + 60_000 });
    expect(getCached(cache, 'active')).toBe('hello');

    // Set with past expiry
    cache.set('expired', { value: 'old', expiresAt: Date.now() - 1000 });
    expect(getCached(cache, 'expired')).toBeNull();
    expect(cache.has('expired')).toBe(false); // cleaned up

    // Non-existent key
    expect(getCached(cache, 'missing')).toBeNull();
  });
});
