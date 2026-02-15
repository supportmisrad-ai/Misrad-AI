import { test, expect } from '@playwright/test';

import {
  getClientIpFromRequest,
  buildRateLimitHeaders,
} from '@/lib/server/rateLimit';

function fakeRequest(headers: Record<string, string>): Request {
  return {
    headers: {
      get(key: string) {
        return headers[key.toLowerCase()] ?? null;
      },
    },
  } as unknown as Request;
}

test.describe('rateLimit utilities', () => {
  test('getClientIpFromRequest extracts x-forwarded-for first IP', async () => {
    const req = fakeRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(getClientIpFromRequest(req)).toBe('1.2.3.4');
  });

  test('getClientIpFromRequest falls back to x-real-ip', async () => {
    const req = fakeRequest({ 'x-real-ip': '10.0.0.1' });
    expect(getClientIpFromRequest(req)).toBe('10.0.0.1');
  });

  test('getClientIpFromRequest falls back to cf-connecting-ip', async () => {
    const req = fakeRequest({ 'cf-connecting-ip': '172.16.0.1' });
    expect(getClientIpFromRequest(req)).toBe('172.16.0.1');
  });

  test('getClientIpFromRequest returns unknown when no headers', async () => {
    const req = fakeRequest({});
    expect(getClientIpFromRequest(req)).toBe('unknown');
  });

  test('getClientIpFromRequest prefers x-forwarded-for over others', async () => {
    const req = fakeRequest({
      'x-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
      'cf-connecting-ip': '3.3.3.3',
    });
    expect(getClientIpFromRequest(req)).toBe('1.1.1.1');
  });

  test('buildRateLimitHeaders returns correct headers', async () => {
    const headers = buildRateLimitHeaders({
      limit: 100,
      remaining: 50,
      resetAt: 1700000000000,
    });
    expect(headers['X-RateLimit-Limit']).toBe('100');
    expect(headers['X-RateLimit-Remaining']).toBe('50');
    expect(headers['X-RateLimit-Reset']).toBe('1700000000');
  });

  test('buildRateLimitHeaders with label suffix', async () => {
    const headers = buildRateLimitHeaders({
      limit: 10,
      remaining: 5,
      resetAt: 1700000000000,
      label: 'ip-min',
    });
    expect(headers['X-RateLimit-Limit-ip-min']).toBe('10');
    expect(headers['X-RateLimit-Remaining-ip-min']).toBe('5');
  });

  test('buildRateLimitHeaders includes Retry-After when provided', async () => {
    const headers = buildRateLimitHeaders({
      limit: 10,
      remaining: 0,
      resetAt: 1700000000000,
      retryAfterSeconds: 30,
    });
    expect(headers['Retry-After']).toBe('30');
  });

  test('buildRateLimitHeaders clamps remaining to 0', async () => {
    const headers = buildRateLimitHeaders({
      limit: 10,
      remaining: -5,
      resetAt: 1700000000000,
    });
    expect(headers['X-RateLimit-Remaining']).toBe('0');
  });
});
