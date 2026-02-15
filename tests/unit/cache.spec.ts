import { test, expect } from '@playwright/test';

import { cached, invalidateCache, invalidateCacheByNamespace, getCacheStats } from '@/lib/cache';

test.describe('cache layer', () => {
  test('cached function returns fresh value on miss', async () => {
    let calls = 0;
    const fn = cached('test-miss', { ttlSeconds: 5 }, async (id: string) => {
      calls++;
      return { id, ts: Date.now() };
    });

    const r1 = await fn('abc');
    expect(r1.id).toBe('abc');
    expect(calls).toBe(1);
  });

  test('cached function returns L1 value on hit', async () => {
    let calls = 0;
    const fn = cached('test-hit', { ttlSeconds: 60 }, async (id: string) => {
      calls++;
      return { id, n: calls };
    });

    const r1 = await fn('x');
    const r2 = await fn('x');
    expect(r1).toEqual(r2);
    expect(calls).toBe(1);
  });

  test('different args produce different cache entries', async () => {
    let calls = 0;
    const fn = cached('test-args', { ttlSeconds: 60 }, async (a: string, b: string) => {
      calls++;
      return `${a}-${b}`;
    });

    await fn('a', '1');
    await fn('a', '2');
    expect(calls).toBe(2);
  });

  test('invalidateCache removes entry', async () => {
    let calls = 0;
    const fn = cached('test-inv', { ttlSeconds: 60 }, async (id: string) => {
      calls++;
      return id;
    });

    await fn('z');
    expect(calls).toBe(1);

    await invalidateCache('test-inv', 'z');
    await fn('z');
    expect(calls).toBe(2);
  });

  test('invalidateCacheByNamespace clears namespace', async () => {
    let calls = 0;
    const fn = cached('test-ns', { ttlSeconds: 60 }, async (id: string) => {
      calls++;
      return id;
    });

    await fn('a');
    await fn('b');
    expect(calls).toBe(2);

    const cleared = invalidateCacheByNamespace('test-ns');
    expect(cleared).toBe(2);

    await fn('a');
    expect(calls).toBe(3);
  });

  test('getCacheStats returns valid stats', async () => {
    const stats = getCacheStats();
    expect(stats.l1MaxEntries).toBeGreaterThan(0);
    expect(typeof stats.l1Size).toBe('number');
  });

  test('cached gracefully handles function errors', async () => {
    const fn = cached('test-err', { ttlSeconds: 60 }, async () => {
      throw new Error('boom');
    });

    await expect(fn()).rejects.toThrow('boom');
  });

  test('cached with l2:false skips Redis', async () => {
    let calls = 0;
    const fn = cached('test-nol2', { ttlSeconds: 60, l2: false }, async (id: string) => {
      calls++;
      return id;
    });

    const r = await fn('q');
    expect(r).toBe('q');
    expect(calls).toBe(1);
  });
});
