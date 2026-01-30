import { test } from '../fixtures/guards';
import { runPageDeepCoverage } from '../helpers/page-deep-coverage';
import type { Page } from '@playwright/test';

test.describe('System: /system/ai_analytics', () => {
  const orgSlug = process.env.E2E_ORG_SLUG;

  test.skip(!orgSlug, 'E2E_ORG_SLUG is required');

  test('deep coverage', async ({ page }: { page: Page }) => {
    await runPageDeepCoverage(page, `/w/${encodeURIComponent(String(orgSlug))}/system/ai_analytics`);
  });
});
