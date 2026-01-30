import { test } from '../fixtures/guards';
import { runPageDeepCoverage } from '../helpers/page-deep-coverage';
import type { Page } from '@playwright/test';

test.describe('System: /system (home)', () => {
  const orgSlug = process.env.E2E_ORG_SLUG;

  test.skip(!orgSlug, 'E2E_ORG_SLUG is required');

  test('deep coverage', async ({ page }: { page: Page }) => {
    test.setTimeout(180_000);
    await runPageDeepCoverage(page, `/w/${encodeURIComponent(String(orgSlug))}/system`, { maxElements: 14 });
  });
});
