import { test, expect } from '@playwright/test';

test.describe('upstash Redis singleton', () => {
  const origUrl = process.env.UPSTASH_REDIS_REST_URL;
  const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  test.afterEach(() => {
    if (origUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = origUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (origToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
    globalThis.__MISRAD_UPSTASH_REDIS_CLIENT__ = undefined;
    globalThis.__MISRAD_UPSTASH_REDIS_URL__ = undefined;
  });

  test('returns null when env vars are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { getUpstashRedisClient } = await import('@/lib/server/upstashRedis');
    expect(getUpstashRedisClient()).toBeNull();
  });

  test('returns null when URL is set but token is missing', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { getUpstashRedisClient } = await import('@/lib/server/upstashRedis');
    expect(getUpstashRedisClient()).toBeNull();
  });

  test('returns same instance on repeated calls (singleton)', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const { getUpstashRedisClient } = await import('@/lib/server/upstashRedis');
    const client1 = getUpstashRedisClient();
    const client2 = getUpstashRedisClient();
    expect(client1).not.toBeNull();
    expect(client1).toBe(client2);
  });

  test('creates new instance when URL changes', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis1.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const { getUpstashRedisClient } = await import('@/lib/server/upstashRedis');
    const client1 = getUpstashRedisClient();

    process.env.UPSTASH_REDIS_REST_URL = 'https://redis2.example.com';
    const client2 = getUpstashRedisClient();

    expect(client1).not.toBeNull();
    expect(client2).not.toBeNull();
    expect(client1).not.toBe(client2);
  });

  test('stores client on globalThis', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const { getUpstashRedisClient } = await import('@/lib/server/upstashRedis');
    const client = getUpstashRedisClient();
    expect(globalThis.__MISRAD_UPSTASH_REDIS_CLIENT__).toBe(client);
    expect(globalThis.__MISRAD_UPSTASH_REDIS_URL__).toBe('https://redis.example.com');
  });
});
