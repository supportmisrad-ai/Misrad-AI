import { test, expect } from '@playwright/test';

import {
  calculateOrderAmount,
  calculatePackageModules,
  getIncludedSeatsForModules,
  getSoloModulePriceMonthly,
  hasNexus,
  BILLING_PACKAGES,
} from '@/lib/billing/pricing';

test.describe('billing pricing', () => {
  test('getSoloModulePriceMonthly returns 149', async () => {
    expect(getSoloModulePriceMonthly()).toBe(149);
  });

  test('hasNexus detects nexus module', async () => {
    expect(hasNexus(['nexus', 'system'])).toBe(true);
    expect(hasNexus(['social', 'client'])).toBe(false);
    expect(hasNexus([])).toBe(false);
  });

  test('getIncludedSeatsForModules: 5 with nexus, 1 without', async () => {
    expect(getIncludedSeatsForModules(['nexus'])).toBe(5);
    expect(getIncludedSeatsForModules(['social'])).toBe(1);
    expect(getIncludedSeatsForModules([])).toBe(1);
  });

  test('calculatePackageModules: solo returns the specified module', async () => {
    const mods = calculatePackageModules({ packageType: 'solo', soloModuleKey: 'social' });
    expect(mods).toEqual(['social']);
  });

  test('calculatePackageModules: solo without key returns empty', async () => {
    const mods = calculatePackageModules({ packageType: 'solo', soloModuleKey: null });
    expect(mods).toEqual([]);
  });

  test('calculatePackageModules: the_empire has all modules', async () => {
    const mods = calculatePackageModules({ packageType: 'the_empire' });
    expect(mods).toContain('nexus');
    expect(mods).toContain('system');
    expect(mods).toContain('social');
    expect(mods).toContain('client');
    expect(mods).toContain('operations');
  });

  test('calculateOrderAmount: solo monthly', async () => {
    const r = calculateOrderAmount({ packageType: 'solo', soloModuleKey: 'social', billingCycle: 'monthly' });
    expect(r.amount).toBe(149);
    expect(r.modules).toEqual(['social']);
    expect(r.includedSeats).toBe(1);
    expect(r.extraSeats).toBe(0);
  });

  test('calculateOrderAmount: the_closer monthly', async () => {
    const r = calculateOrderAmount({ packageType: 'the_closer', billingCycle: 'monthly' });
    expect(r.amount).toBe(249);
    expect(r.modules).toContain('nexus');
    expect(r.includedSeats).toBe(5);
  });

  test('calculateOrderAmount: yearly gets 20% discount', async () => {
    const monthly = calculateOrderAmount({ packageType: 'the_closer', billingCycle: 'monthly' });
    const yearly = calculateOrderAmount({ packageType: 'the_closer', billingCycle: 'yearly' });
    expect(yearly.amount).toBe(Math.round(monthly.amount * 0.8));
  });

  test('calculateOrderAmount: extra seats add 39 each', async () => {
    const base = calculateOrderAmount({ packageType: 'the_closer', billingCycle: 'monthly', seats: 5 });
    const extra = calculateOrderAmount({ packageType: 'the_closer', billingCycle: 'monthly', seats: 8 });
    expect(extra.extraSeats).toBe(3);
    expect(extra.amount - base.amount).toBe(3 * 39);
  });

  test('calculateOrderAmount: solo with extra seats throws', async () => {
    expect(() =>
      calculateOrderAmount({ packageType: 'solo', soloModuleKey: 'social', billingCycle: 'monthly', seats: 3 })
    ).toThrow();
  });

  test('BILLING_PACKAGES has all expected keys', async () => {
    const keys = Object.keys(BILLING_PACKAGES);
    expect(keys).toContain('solo');
    expect(keys).toContain('the_closer');
    expect(keys).toContain('the_authority');
    expect(keys).toContain('the_operator');
    expect(keys).toContain('the_empire');
    expect(keys).toContain('the_mentor');
  });

  test('all packages have positive monthly price', async () => {
    for (const [, pkg] of Object.entries(BILLING_PACKAGES)) {
      expect(pkg.monthlyPrice).toBeGreaterThan(0);
    }
  });
});
