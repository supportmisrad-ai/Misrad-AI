import { test, expect } from '@playwright/test';

import { calculateSeatCharge } from '@/lib/billing/calculator';

test.describe('billing calculator', () => {
  test('zero seats returns zero', async () => {
    const r = calculateSeatCharge({
      startAt: '2026-01-01T00:00:00Z',
      endAt: '2026-02-01T00:00:00Z',
      seats: 0,
    });
    expect(r.amount).toBe(0);
    expect(r.fraction).toBe(0);
  });

  test('negative seats returns zero', async () => {
    const r = calculateSeatCharge({
      startAt: '2026-01-01T00:00:00Z',
      endAt: '2026-02-01T00:00:00Z',
      seats: -5,
    });
    expect(r.amount).toBe(0);
  });

  test('full month returns full charge', async () => {
    const r = calculateSeatCharge({
      startAt: '2026-01-01T00:00:00Z',
      endAt: '2026-02-01T00:00:00Z',
      seats: 1,
      unitAmount: 100,
      cadence: 'monthly',
    });
    expect(r.amount).toBe(100);
    expect(r.fraction).toBe(1);
  });

  test('half month returns half charge', async () => {
    const r = calculateSeatCharge({
      startAt: '2026-01-16T00:00:00Z',
      endAt: '2026-02-01T00:00:00Z',
      seats: 1,
      unitAmount: 100,
      cadence: 'monthly',
    });
    expect(r.fraction).toBeGreaterThan(0.4);
    expect(r.fraction).toBeLessThan(0.6);
    expect(r.amount).toBeGreaterThan(40);
    expect(r.amount).toBeLessThan(60);
  });

  test('multiple seats multiplied correctly', async () => {
    const r = calculateSeatCharge({
      startAt: '2026-01-01T00:00:00Z',
      endAt: '2026-02-01T00:00:00Z',
      seats: 5,
      unitAmount: 39,
      cadence: 'monthly',
    });
    expect(r.amount).toBe(195);
  });

  test('end before start returns zero', async () => {
    const r = calculateSeatCharge({
      startAt: '2026-02-01T00:00:00Z',
      endAt: '2026-01-01T00:00:00Z',
      seats: 1,
      unitAmount: 100,
    });
    expect(r.amount).toBe(0);
  });

  test('yearly cadence works', async () => {
    const r = calculateSeatCharge({
      startAt: '2025-02-15T00:00:00Z',
      endAt: '2026-02-15T00:00:00Z',
      seats: 1,
      unitAmount: 468,
      cadence: 'yearly',
    });
    expect(r.fraction).toBe(1);
    expect(r.amount).toBe(468);
  });

  test('default unitAmount is 39', async () => {
    const r = calculateSeatCharge({
      startAt: '2026-01-01T00:00:00Z',
      endAt: '2026-02-01T00:00:00Z',
      seats: 1,
    });
    expect(r.amount).toBe(39);
  });

  test('invalid dates return zero', async () => {
    const r = calculateSeatCharge({
      startAt: 'not-a-date',
      endAt: '2026-02-01T00:00:00Z',
      seats: 1,
    });
    expect(r.amount).toBe(0);
  });
});
