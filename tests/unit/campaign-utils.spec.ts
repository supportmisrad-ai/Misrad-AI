import { test, expect } from '@playwright/test';

import { normalizeCampaignStatus } from '@/lib/campaign-utils';

test.describe('campaign-utils', () => {
  test('normalizeCampaignStatus - exact matches', async () => {
    expect(normalizeCampaignStatus('active')).toBe('active');
    expect(normalizeCampaignStatus('paused')).toBe('paused');
    expect(normalizeCampaignStatus('draft')).toBe('draft');
  });

  test('normalizeCampaignStatus - completed maps to paused', async () => {
    expect(normalizeCampaignStatus('completed')).toBe('paused');
  });

  test('normalizeCampaignStatus - fallback to active', async () => {
    expect(normalizeCampaignStatus('')).toBe('active');
    expect(normalizeCampaignStatus('unknown')).toBe('active');
  });

  test('normalizeCampaignStatus - case insensitive', async () => {
    expect(normalizeCampaignStatus('Active')).toBe('active');
    expect(normalizeCampaignStatus('PAUSED')).toBe('paused');
    expect(normalizeCampaignStatus('Draft')).toBe('draft');
  });
});
