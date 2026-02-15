import { Redis } from '@upstash/redis';

declare global {
  var __MISRAD_UPSTASH_REDIS_CLIENT__: Redis | null | undefined;
  var __MISRAD_UPSTASH_REDIS_URL__: string | undefined;
}

export function getUpstashRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const existing = globalThis.__MISRAD_UPSTASH_REDIS_CLIENT__;
  if (existing && globalThis.__MISRAD_UPSTASH_REDIS_URL__ === url) return existing;

  try {
    const client = new Redis({ url, token });
    globalThis.__MISRAD_UPSTASH_REDIS_CLIENT__ = client;
    globalThis.__MISRAD_UPSTASH_REDIS_URL__ = url;
    return client;
  } catch {
    return null;
  }
}
