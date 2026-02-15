import { test, expect } from '@playwright/test';

import { getPackageLabelHe, getPackagePrice, getPackageModules } from '@/lib/billing/plan-labels';

test.describe('billing plan-labels', () => {
  test('getPackageLabelHe returns Hebrew label for known plan', async () => {
    expect(getPackageLabelHe('the_closer')).toBe('חבילת מכירות');
    expect(getPackageLabelHe('the_empire')).toBe('הכל כלול');
    expect(getPackageLabelHe('solo')).toBe('מודול בודד');
  });

  test('getPackageLabelHe returns fallback for null/undefined', async () => {
    expect(getPackageLabelHe(null)).toBe('ללא חבילה');
    expect(getPackageLabelHe(undefined)).toBe('ללא חבילה');
  });

  test('getPackageLabelHe returns raw key for unknown plan', async () => {
    expect(getPackageLabelHe('unknown_plan')).toBe('unknown_plan');
  });

  test('getPackagePrice returns monthly price', async () => {
    expect(getPackagePrice('solo')).toBe(149);
    expect(getPackagePrice('the_closer')).toBe(249);
    expect(getPackagePrice('the_empire')).toBe(499);
  });

  test('getPackagePrice returns null for null/undefined', async () => {
    expect(getPackagePrice(null)).toBeNull();
    expect(getPackagePrice(undefined)).toBeNull();
  });

  test('getPackagePrice returns null for unknown plan', async () => {
    expect(getPackagePrice('nonexistent')).toBeNull();
  });

  test('getPackageModules returns modules array', async () => {
    const mods = getPackageModules('the_empire');
    expect(mods).toContain('nexus');
    expect(mods).toContain('system');
    expect(mods.length).toBeGreaterThan(3);
  });

  test('getPackageModules returns empty for null', async () => {
    expect(getPackageModules(null)).toEqual([]);
    expect(getPackageModules(undefined)).toEqual([]);
  });

  test('getPackageModules returns empty for solo (no built-in modules)', async () => {
    expect(getPackageModules('solo')).toEqual([]);
  });
});
