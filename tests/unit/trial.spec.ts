import { test, expect } from '@playwright/test';

import {
  calculateTrialEndDate,
  calculateDaysRemaining,
  isTrialExpired,
  getTrialInfo,
  initializeTrial,
  DEFAULT_TRIAL_DAYS,
} from '@/lib/trial';

test.describe('trial utilities', () => {
  test('DEFAULT_TRIAL_DAYS is 7', async () => {
    expect(DEFAULT_TRIAL_DAYS).toBe(7);
  });

  test('calculateTrialEndDate adds correct days', async () => {
    const start = new Date('2026-02-01T00:00:00Z');
    const end = calculateTrialEndDate(start, 14);
    expect(end.toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });

  test('calculateTrialEndDate handles month boundaries', async () => {
    const start = new Date('2026-01-28T00:00:00Z');
    const end = calculateTrialEndDate(start, 7);
    expect(end.getUTCDate()).toBe(4);
    expect(end.getUTCMonth()).toBe(1);
  });

  test('calculateDaysRemaining returns null for non-trial', async () => {
    const start = new Date('2026-02-01T00:00:00Z');
    expect(calculateDaysRemaining(start, 14, 'active')).toBeNull();
    expect(calculateDaysRemaining(start, 14, null)).toBeNull();
    expect(calculateDaysRemaining(null, 14, 'trial')).toBeNull();
  });

  test('isTrialExpired returns false for non-trial status', async () => {
    const old = new Date('2020-01-01T00:00:00Z');
    expect(isTrialExpired(old, 7, 'active')).toBe(false);
    expect(isTrialExpired(null, 7, 'trial')).toBe(false);
  });

  test('isTrialExpired returns true for expired trial', async () => {
    const old = new Date('2020-01-01T00:00:00Z');
    expect(isTrialExpired(old, 7, 'trial')).toBe(true);
  });

  test('getTrialInfo returns correct info for active status', async () => {
    const info = getTrialInfo(new Date('2026-01-01T00:00:00Z'), 14, 'active', null);
    expect(info.status).toBe('active');
    expect(info.isActive).toBe(true);
    expect(info.isExpired).toBe(false);
  });

  test('getTrialInfo marks expired trial', async () => {
    const old = new Date('2020-01-01T00:00:00Z');
    const info = getTrialInfo(old, 7, 'trial', null);
    expect(info.status).toBe('expired');
    expect(info.isExpired).toBe(true);
    expect(info.isActive).toBe(false);
  });

  test('getTrialInfo handles null start date', async () => {
    const info = getTrialInfo(null, 7, 'trial', null);
    expect(info.trialEndDate).toBeNull();
    expect(info.status).toBe('trial');
  });

  test('initializeTrial returns correct defaults', async () => {
    const t = initializeTrial();
    expect(t.trialDays).toBe(7);
    expect(t.subscriptionStatus).toBe('trial');
    expect(t.trialStartDate).toBeInstanceOf(Date);
  });

  test('initializeTrial accepts custom days', async () => {
    const t = initializeTrial(30);
    expect(t.trialDays).toBe(30);
  });
});
