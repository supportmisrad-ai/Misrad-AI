import { test, expect } from '../fixtures/guards';

function getHeaderAnyCase(headers: Record<string, string>, name: string): string | null {
  const target = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (String(k || '').toLowerCase() === target) return String(v ?? '');
  }
  return null;
}

test.describe('Public endpoint rate limiting', () => {
  test('public/leads is fail-closed when redis is unavailable', async ({ request }) => {
    const apiKey = process.env.E2E_PUBLIC_LEADS_API_KEY;
    test.skip(!apiKey, 'E2E_PUBLIC_LEADS_API_KEY is required');

    const res = await request.post(`/api/public/leads?key=${encodeURIComponent(String(apiKey))}`, {
      headers: {
        'content-type': 'application/json',
      },
      data: {
        name: 'E2E Lead',
        email: 'e2e-lead@example.com',
        orgSlug: 'nonexistent-org-slug',
      },
    });

    // We only assert the rate-limit gate. The endpoint may return 503 (unavailable) or 429 (limited).
    // In the Redis-down simulation we expect 503.
    expect([429, 503]).toContain(res.status());

    const headers = res.headers();
    const retryAfter = getHeaderAnyCase(headers, 'retry-after');
    expect(retryAfter).toBeTruthy();

    const limit = getHeaderAnyCase(headers, 'x-ratelimit-limit');
    const remaining = getHeaderAnyCase(headers, 'x-ratelimit-remaining');
    const reset = getHeaderAnyCase(headers, 'x-ratelimit-reset');

    expect(limit).toBeTruthy();
    expect(remaining).toBeTruthy();
    expect(reset).toBeTruthy();
  });
});
